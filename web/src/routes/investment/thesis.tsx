import { TagInput } from '#/components/investment/TagInput';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Badge } from '#/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs';
import { Textarea } from '#/components/ui/textarea';
import { useAuth } from '#/hooks/useAuth';
import type { Thesis } from '#/modules/investment/interfaces';
import { addThesisSchema } from '#/modules/investment/schemas';
import { computeFIFO, computePositions, filterActiveTheses } from '#/modules/investment/utils';
import {
  useAddThesisMutation,
  useDeleteThesisMutation,
  useHeldSymbols,
  useInvestmentThesesQuery,
  useInvestmentTransactionsQuery,
  useLivePrices,
} from '#/queries/investment';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const PREDEFINED_TAGS = [
  'Growth',
  'AI',
  'Undervalued',
  'Recovery',
  'Macro',
  'Product Launch',
  'Earnings Expansion',
];

function InvestmentThesisPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [thesisToDelete, setThesisToDelete] = useState<string | null>(null);

  // Form state
  const [formSymbol, setFormSymbol] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formLinkedTransaction, setFormLinkedTransaction] = useState<string>('');
  const [formError, setFormError] = useState('');

  const addThesisMutation = useAddThesisMutation(user?.uid);
  const deleteThesisMutation = useDeleteThesisMutation(user?.uid);

  const { data: theses = [], isLoading: thesesLoading } = useInvestmentThesesQuery(user?.uid);
  const { data: transactions = [] } = useInvestmentTransactionsQuery(user?.uid);

  // Display prices: cached live quote preferred, manual price as fallback. Also
  // refreshes anything stale via /api/stocks.
  const heldSymbols = useHeldSymbols(transactions);
  const { priceMap } = useLivePrices(heldSymbols);

  const positions = useMemo(() => {
    if (transactions.length === 0) return [];
    const fifoResult = computeFIFO(transactions);
    return computePositions(fifoResult.lots, priceMap);
  }, [transactions, priceMap]);

  const activeTheses = useMemo(
    () => filterActiveTheses(theses, positions),
    [theses, positions]
  );

  const filteredAllTheses = useMemo(() => {
    if (!symbolFilter.trim()) return theses;
    const normalizedFilter = symbolFilter.trim().toUpperCase();
    return theses.filter((thesis) => thesis.symbol.includes(normalizedFilter));
  }, [theses, symbolFilter]);

  const buyTransactionsForSymbol = useMemo(() => {
    if (!formSymbol.trim()) return [];
    const normalizedSymbol = formSymbol.trim().toUpperCase();
    return transactions.filter((t) => t.type === 'BUY' && t.symbol === normalizedSymbol);
  }, [transactions, formSymbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!user) return;

    const thesisData = {
      userId: user.uid,
      symbol: formSymbol.trim().toUpperCase(),
      tags: formTags,
      notes: formNotes,
      linkedTransactionId: formLinkedTransaction || null,
    };

    const result = addThesisSchema.safeParse(thesisData);
    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }

    try {
      await addThesisMutation.mutateAsync(thesisData);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to add thesis');
    }
  };

  const resetForm = () => {
    setFormSymbol('');
    setFormTags([]);
    setFormNotes('');
    setFormLinkedTransaction('');
    setFormError('');
  };

  const handleDelete = async () => {
    if (!thesisToDelete) return;

    try {
      await deleteThesisMutation.mutateAsync(thesisToDelete);
      setDeleteDialogOpen(false);
      setThesisToDelete(null);
    } catch (error) {
      console.error('Failed to delete thesis:', error);
    }
  };

  if (!user) {
    return <div className="p-6">Please log in to view your theses.</div>;
  }

  if (thesesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-9 w-56 mb-6" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const ThesisCard = ({ thesis }: { thesis: Thesis; }) => {
    const linkedTx = thesis.linkedTransactionId
      ? transactions.find((t) => t.id === thesis.linkedTransactionId)
      : null;

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{thesis.symbol}</h3>
            <p className="text-sm text-gray-600">
              {thesis.createdAt.toDate().toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setThesisToDelete(thesis.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {thesis.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-gray-700 whitespace-pre-wrap">{thesis.notes}</p>

        {linkedTx && (
          <p className="text-xs text-gray-500">
            Linked to {linkedTx.type} {linkedTx.qty} @ ${linkedTx.price.toFixed(2)} on{' '}
            {linkedTx.date.toDate().toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Investment Thesis Journal</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Thesis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Investment Thesis</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="uppercase"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <TagInput
                  value={formTags}
                  onChange={setFormTags}
                  predefinedTags={PREDEFINED_TAGS}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Why are you buying this asset?"
                  rows={6}
                />
              </div>

              {buyTransactionsForSymbol.length > 0 && (
                <div>
                  <Label htmlFor="linkedTransaction">Linked Transaction (Optional)</Label>
                  <Select
                    value={formLinkedTransaction}
                    onValueChange={setFormLinkedTransaction}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a transaction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {buyTransactionsForSymbol.map((tx) => (
                        <SelectItem key={tx.id} value={tx.id}>
                          BUY {tx.qty} @ ${tx.price.toFixed(2)} on{' '}
                          {tx.date.toDate().toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Thesis</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Theses</TabsTrigger>
          <TabsTrigger value="all">All Theses</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeTheses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No active theses. Your theses will appear here when you hold a position in the
              linked symbol.
            </div>
          ) : (
            <div className="grid gap-4">
              {activeTheses.map((thesis) => (
                <ThesisCard key={thesis.id} thesis={thesis} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="mb-4">
            <Input
              placeholder="Filter by symbol..."
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {filteredAllTheses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {symbolFilter ? 'No theses match your filter.' : 'No theses recorded yet.'}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAllTheses.map((thesis) => (
                <ThesisCard key={thesis.id} thesis={thesis} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thesis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this thesis? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute('/investment/thesis')({
  component: InvestmentThesisPage,
});
