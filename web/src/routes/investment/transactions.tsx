import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { Textarea } from '#/components/ui/textarea';
import { useAuth } from '#/hooks/useAuth';
import {
  evaluateFeeFormula
} from '#/modules/investment/fee-evaluator';
import { computeFIFO, computePositions } from '#/modules/investment/utils';
import {
  useAddTransactionMutation,
  useFeePresetsQuery,
  useHeldSymbols,
  useInvestmentTransactionsQuery,
  useLivePrices,
  useUpdatePriceMutation,
} from '#/queries/investment';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Timestamp } from 'firebase/firestore';
import { AlertCircle, Plus, Settings, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const transactionSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .transform((val) => val.trim().toUpperCase()),
  type: z.enum(['BUY', 'SELL']).default('BUY'),
  quantity: z.number().positive('Quantity must be positive'),
  pricePerShare: z.number().positive('Price must be positive'),
  fee: z.number().min(0, 'Fee cannot be negative').default(0),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface FeeRule {
  id: string;
  label: string;
  formula: string;
}

function InvestmentTransactionsPage() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPositions, setShowPositions] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [feePopoverOpen, setFeePopoverOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const { data: transactions = [], isLoading: txLoading } =
    useInvestmentTransactionsQuery(user?.uid);
  const { data: presets = [] } = useFeePresetsQuery(user?.uid);

  const addTransactionMutation = useAddTransactionMutation(user?.uid);
  const updatePriceMutation = useUpdatePriceMutation(user?.uid);

  // Display prices: cached live quote preferred, manual price as fallback. Also
  // refreshes anything stale via /api/stocks.
  const heldSymbols = useHeldSymbols(transactions);
  const { priceMap } = useLivePrices(heldSymbols);

  const positions = useMemo(() => {
    if (transactions.length === 0) return [];
    const fifoResult = computeFIFO(transactions);
    return computePositions(fifoResult.lots, priceMap);
  }, [transactions, priceMap]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'BUY',
      fee: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedType = watch('type');
  const selectedSymbol = watch('symbol');
  const selectedQuantity = watch('quantity');
  const selectedPricePerShare = watch('pricePerShare');

  const feeScope = useMemo(
    () => ({
      amount: (selectedQuantity || 0) * (selectedPricePerShare || 0),
      shares: selectedQuantity || 0,
      price: selectedPricePerShare || 0,
    }),
    [selectedQuantity, selectedPricePerShare],
  );

  // per-rule results: number if valid, error string if not
  const feeResults = useMemo(
    () =>
      feeRules.map((rule) => {
        try {
          return evaluateFeeFormula(rule.formula, feeScope);
        } catch (e) {
          return e instanceof Error ? e.message : 'Invalid formula';
        }
      }),
    [feeRules, feeScope],
  );

  const allRulesValid =
    feeRules.length === 0 || feeResults.every((r) => typeof r === 'number');

  const calculatedFee = useMemo(
    () =>
      feeResults.reduce<number>(
        (sum, r) => sum + (typeof r === 'number' ? r : 0),
        0,
      ),
    [feeResults],
  );

  const addFeeRule = () => {
    setFeeRules([
      ...feeRules,
      { id: crypto.randomUUID(), label: '', formula: '' },
    ]);
  };

  const updateFeeRule = (id: string, patch: Partial<Omit<FeeRule, 'id'>>) => {
    setFeeRules(feeRules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeFeeRule = (id: string) => {
    setFeeRules(feeRules.filter((r) => r.id !== id));
  };

  const loadPreset = (presetName: string) => {
    const preset = presets.find((p) => p.name === presetName);
    if (!preset) return;
    setFeeRules(preset.rules.map((r) => ({ id: crypto.randomUUID(), ...r })));
    setSelectedPreset(presetName);
  };

  const clearFeeRules = () => {
    setFeeRules([]);
    setSelectedPreset('');
  };

  const applyCalculatedFee = () => {
    setValue('fee', parseFloat(calculatedFee.toFixed(2)));
    setFeePopoverOpen(false);
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!user) return;

    // SELL validation: check available quantity
    if (data.type === 'SELL') {
      const symbol = data.symbol.trim().toUpperCase();
      const position = positions.find((p) => p.symbol === symbol);
      const availableQty = position?.totalQty || 0;

      if (data.quantity > availableQty) {
        alert(
          `Cannot sell ${data.quantity} shares. Only ${availableQty} available.`,
        );
        return;
      }
    }

    try {
      await addTransactionMutation.mutateAsync({
        userId: user.uid,
        symbol: data.symbol,
        type: data.type,
        qty: data.quantity,
        price: data.pricePerShare,
        fee: data.fee,
        date: Timestamp.fromDate(new Date(data.date)),
        notes: data.notes || '',
      });
      reset();
      setFeeRules([]);
      setSelectedPreset('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleUpdatePrice = async (symbol: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      await updatePriceMutation.mutateAsync({ symbol, price });
      setEditingPrice(null);
      setNewPrice('');
    } catch (error) {
      console.error('Failed to update price:', error);
      alert('Failed to update price. Please try again.');
    }
  };

  if (!user) {
    return <div className="p-6">Please log in to view transactions.</div>;
  }

  if (txLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-9 w-80" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3">
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-4">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Investment Transactions</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPositions(!showPositions)}
          >
            {showPositions ? 'Show Transactions' : 'Show Positions'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    {...register('symbol')}
                    placeholder="AAPL"
                  />
                  {errors.symbol && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.symbol.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(v) =>
                      setValue('type', v as TransactionFormData['type'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.type.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="any"
                    {...register('quantity', { valueAsNumber: true })}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.quantity.message}
                    </p>
                  )}
                  {selectedType === 'SELL' &&
                    selectedSymbol &&
                    selectedQuantity && (
                      <p className="text-sm text-gray-500 mt-1">
                        Available:{' '}
                        {positions.find(
                          (p) =>
                            p.symbol === selectedSymbol.trim().toUpperCase(),
                        )?.totalQty || 0}
                      </p>
                    )}
                </div>

                <div>
                  <Label htmlFor="pricePerShare">Price per Share</Label>
                  <Input
                    id="pricePerShare"
                    type="number"
                    step="0.00001"
                    {...register('pricePerShare', { valueAsNumber: true })}
                  />
                  {errors.pricePerShare && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.pricePerShare.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fee">Fee</Label>
                  <Popover
                    open={feePopoverOpen}
                    onOpenChange={setFeePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Input
                        id="fee"
                        type="number"
                        step="0.01"
                        {...register('fee', { valueAsNumber: true })}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="start">
                      <div className="space-y-3">
                        {/* Header */}
                        <div>
                          <h3 className="font-semibold text-sm">
                            Fee Calculator
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            amount={feeScope.amount.toFixed(2)}
                            {'  '}
                            shares={feeScope.shares}
                            {'  '}
                            price={feeScope.price.toFixed(2)}
                          </p>
                        </div>

                        {/* Preset selector */}
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedPreset}
                            onValueChange={loadPreset}
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Load a preset..." />
                            </SelectTrigger>
                            <SelectContent>
                              {presets.map((p) => (
                                <SelectItem key={p.name} value={p.name}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.open('/investment/settings', '_blank')
                            }
                            className="h-8 px-2"
                            title="Manage Presets"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          {feeRules.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={clearFeeRules}
                              className="h-8 px-2 text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>

                        {/* Syntax hint */}
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 font-mono">
                          vars: <span className="text-foreground">amount</span>,{' '}
                          <span className="text-foreground">shares</span>,{' '}
                          <span className="text-foreground">price</span>
                          {'  '}fns:{' '}
                          <span className="text-foreground">min()</span>,{' '}
                          <span className="text-foreground">max()</span>,{' '}
                          <span className="text-foreground">abs()</span>
                        </p>

                        {/* Rules list */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">
                              Fee Rules
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={addFeeRule}
                              className="h-7 px-2 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>

                          {feeRules.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">
                              No rules yet. Add one or load a preset.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                              {feeRules.map((rule, idx) => {
                                const result = feeResults[idx];
                                const isError = typeof result === 'string';
                                return (
                                  <div key={rule.id} className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        value={rule.label}
                                        onChange={(e) =>
                                          updateFeeRule(rule.id, {
                                            label: e.target.value,
                                          })
                                        }
                                        placeholder="Label"
                                        className="h-7 text-xs flex-1"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeFeeRule(rule.id)}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        value={rule.formula}
                                        onChange={(e) =>
                                          updateFeeRule(rule.id, {
                                            formula: e.target.value,
                                          })
                                        }
                                        placeholder="e.g. max(amount * 0.003 * 1.11, 0.01)"
                                        className={`h-7 text-xs font-mono flex-1 ${isError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                      />
                                      <span
                                        className={`text-xs min-w-[56px] text-right shrink-0 ${isError ? 'text-destructive' : 'text-muted-foreground'}`}
                                      >
                                        {isError ? (
                                          <AlertCircle className="h-3.5 w-3.5 inline" />
                                        ) : (
                                          `= ${(result).toFixed(4)}`
                                        )}
                                      </span>
                                    </div>
                                    {isError && (
                                      <p className="text-xs text-destructive pl-0.5">
                                        {result}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="pt-2 border-t flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            Total: {calculatedFee.toFixed(4)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={applyCalculatedFee}
                            disabled={!allRulesValid || feeRules.length === 0}
                          >
                            Apply to Fee
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {errors.fee && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.fee.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    {...register('date')}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Optional notes about this transaction"
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.notes.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addTransactionMutation.isPending}>
                    {addTransactionMutation.isPending ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showPositions ? (
        // Positions View
        positions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No positions yet. Add your first transaction to get started.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Total Qty
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Avg Cost Basis
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Current Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Market Value
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Unrealized P/L
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Unrealized P/L %
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {positions.map((position) => (
                  <tr key={position.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{position.symbol}</td>
                    <td className="px-4 py-3 text-right">
                      {position.totalQty.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${position.avgCostBasis.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingPrice === position.symbol ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-24 h-7 text-sm"
                            placeholder="Price"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePrice(position.symbol)}
                            className="h-7 px-2"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPrice(null);
                              setNewPrice('');
                            }}
                            className="h-7 px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : position.currentPrice ? (
                        `$${position.currentPrice.toFixed(2)}`
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {position.marketValue
                        ? `$${position.marketValue.toFixed(2)}`
                        : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${position.unrealizedPL && position.unrealizedPL > 0
                        ? 'text-green-600'
                        : position.unrealizedPL && position.unrealizedPL < 0
                          ? 'text-red-600'
                          : ''
                        }`}
                    >
                      {position.unrealizedPL !== null
                        ? `$${position.unrealizedPL.toFixed(2)}`
                        : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${position.unrealizedPLPct && position.unrealizedPLPct > 0
                        ? 'text-green-600'
                        : position.unrealizedPLPct &&
                          position.unrealizedPLPct < 0
                          ? 'text-red-600'
                          : ''
                        }`}
                    >
                      {position.unrealizedPLPct !== null
                        ? `${position.unrealizedPLPct > 0 ? '+' : ''}${position.unrealizedPLPct.toFixed(2)}%`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingPrice !== position.symbol && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPrice(position.symbol);
                            setNewPrice(position.currentPrice?.toString() || '');
                          }}
                        >
                          Update Price
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : // Transactions View
        transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No transactions yet. Click "Add Transaction" to get started.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Fee
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{tx.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded ${tx.type === 'BUY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{tx.qty}</td>
                    <td className="px-4 py-3 text-right">
                      ${tx.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">${tx.fee.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {tx.date.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {tx.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

export const Route = createFileRoute('/investment/transactions')({
  component: InvestmentTransactionsPage,
});
