import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '#/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '#/components/ui/table';
import { useLoading } from '#/hooks/useLoading';
import { Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';

interface CsvImporterProps {
  onImport: (data: Record<string, unknown>[]) => void;
}

const parseFile = async (file: File): Promise<Record<string, unknown>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as Record<string, unknown>[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

const excludes = <T,>(arr: T[], ...items: T[]): T[] => {
  return arr.filter((item) => !items.includes(item));
};

export function CsvImporter({ onImport }: CsvImporterProps) {
  const [isLoading, loading] = useLoading();
  const [source, setSource] = useState<File>();
  const [data, setData] = useState<Array<Record<string, unknown> & { $id: string }>>([]);
  const [dataCols, setDataCols] = useState<string[]>([]);
  const [colNameFields, setColNameFields] = useState({
    name: 'name',
    contactNumber: 'contactNumber',
  });
  const [includeAsLabels, setIncludeAsLabels] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSource(file);
  };

  const handleImportClick = () => {
    const imported = data.map(({ $id, [colNameFields.name]: name, [colNameFields.contactNumber]: contactNumber, ...cols }) => ({
      name,
      contactNumber,
      labels: Object.fromEntries(
        Object.entries(cols).filter(([k]) => includeAsLabels.includes(k))
      ),
    }));
    onImport(imported);
  };

  const handleRowDelete = (id: string) => {
    setData((prev) => prev.filter((row) => row.$id !== id));
  };

  useEffect(() => {
    if (!source) return;

    loading(
      parseFile(source).then((parsed) => {
        const withIds = parsed.map((el) => ({ ...el, $id: nanoid() }));
        setData(withIds);
        const cols = [...new Set(parsed.flatMap((row) => Object.keys(row)))];
        setDataCols(cols);
      })
    );
  }, [source]);

  useEffect(() => {
    setIncludeAsLabels((prev) =>
      excludes(prev, colNameFields.name, colNameFields.contactNumber)
    );
  }, [colNameFields.name, colNameFields.contactNumber]);

  const columns = [
    { key: colNameFields.name, label: 'Name' },
    { key: colNameFields.contactNumber, label: 'Contact Number' },
    { key: 'labels', label: 'Labels' },
    { key: 'actions', label: '' },
  ];

  return (
    <Card>
      <CardHeader>Import CSV</CardHeader>
      <CardContent className="space-y-6">
        <ol className="space-y-4 list-decimal list-inside">
          <li>
            <div className="ml-2 space-y-2">
              <span className="font-medium">Choose a file</span>
              <div className="flex gap-2 items-center">
                <Button variant="outline" className="relative">
                  Choose
                  <label className="absolute inset-0 cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </Button>
                {source && <span className="text-sm">{source.name}</span>}
              </div>
            </div>
          </li>

          <li>
            <div className="ml-2 space-y-2">
              <span className="font-medium">Define columns</span>
              <table className="w-full">
                <tbody>
                  <tr>
                    <th className="w-48 text-left py-2">Name</th>
                    <td>
                      <select
                        value={colNameFields.name}
                        onChange={(e) =>
                          setColNameFields((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        disabled={!dataCols.length}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {[...new Set(['name', ...dataCols])].map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <th className="w-48 text-left py-2">Contact Number</th>
                    <td>
                      <select
                        value={colNameFields.contactNumber}
                        onChange={(e) =>
                          setColNameFields((prev) => ({
                            ...prev,
                            contactNumber: e.target.value,
                          }))
                        }
                        disabled={!dataCols.length}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {[...new Set(['contactNumber', ...dataCols])].map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <th className="w-48 text-left py-2 align-top">Add Labels from</th>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        {excludes(
                          dataCols,
                          colNameFields.name,
                          colNameFields.contactNumber
                        ).map((prop) => (
                          <label key={prop} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={includeAsLabels.includes(prop)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setIncludeAsLabels((prev) => [...prev, prop]);
                                } else {
                                  setIncludeAsLabels((prev) =>
                                    prev.filter((p) => p !== prop)
                                  );
                                }
                              }}
                            />
                            <span className="text-sm">{prop}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </li>

          <li>
            <div className="ml-2 space-y-2">
              <span className="font-medium">Preview your data</span>
              <div className="max-h-[40vh] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((row) => (
                        <TableRow key={row.$id}>
                          <TableCell>{String(row[colNameFields.name] || '')}</TableCell>
                          <TableCell>{String(row[colNameFields.contactNumber] || '')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap max-w-md">
                              {Object.entries(row)
                                .filter(([k]) => includeAsLabels.includes(k))
                                .map(([key, val]) => (
                                  <Badge key={key} variant="secondary">
                                    {key}: {String(val)}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRowDelete(row.$id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <small className="text-sm text-gray-500">{data.length} rows</small>
              </div>
            </div>
          </li>
        </ol>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          onClick={handleImportClick}
          disabled={!data.length}
        >
          Import
        </Button>
      </CardFooter>
    </Card>
  );
}
