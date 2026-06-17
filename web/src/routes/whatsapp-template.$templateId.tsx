import { CsvImporter } from '#/components/CsvImporter'
import { ProgressCircular } from '#/components/ProgressCircular'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { WhatsappTemplateForm } from '#/components/WhatsappTemplateForm'
import { WhatsappTemplateRecipientForm } from '#/components/WhatsappTemplateRecipientForm'
import { useCollection, useDocument } from '#/hooks/useFirestore'
import { useLoading } from '#/hooks/useLoading'
import { useToast } from '#/hooks/useToast'
import { db } from '#/lib/firebase'
import type { Recipient } from '#/modules/template/interfaces'
import { getTemplateService } from '#/modules/template/service'
import { buildWhatsAppLink, compileMessage } from '#/modules/template/utils'
import { createFileRoute } from '@tanstack/react-router'
import { collection, doc, orderBy, query } from 'firebase/firestore'
import {
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/whatsapp-template/$templateId')({
  component: WhatsappTemplateDetail,
})

const isContactSupported = () => 'contacts' in window.navigator
const selectContacts = () =>
  navigator.contacts?.select(['name', 'tel'], { multiple: true })

const formatTelFromContact = (tel: string) => {
  if (tel.startsWith('08')) return `62${tel.slice(1)}`
  if (tel.startsWith('+')) return tel.replace(/\D/g, '')
  return tel
}

function WhatsappTemplateDetail() {
  const { templateId } = Route.useParams()
  const { toast } = useToast()
  const [isLoading, loading] = useLoading()

  // Get service instance
  const service = getTemplateService(db)

  // Subscribe to template document
  const templateRef = doc(db, 'labs/whatsapp-template/templates', templateId)
  const { data: template, loading: templateLoading } = useDocument(templateRef)

  // Subscribe to recipients collection
  const recipientsRef = collection(templateRef, 'recipients')
  const recipientsQuery = query(recipientsRef, orderBy('name', 'asc'))
  const { data: recipients, loading: recipientsLoading } =
    useCollection(recipientsQuery)

  // State
  const [recipientFields, setRecipientFields] = useState<
    Recipient | undefined
  >()
  const [recipientIdModal, setRecipientIdModal] = useState<string>()
  const [showImportCsvModal, setShowImportCsvModal] = useState(false)
  const [selected, setSelected] = useState<Array<Recipient & { id: string }>>(
    [],
  )
  const [showContactMap, setShowContactMap] = useState<Record<string, boolean>>(
    {},
  )
  const [showMessagePreview, setShowMessagePreview] = useState<
    Record<string, boolean>
  >({})

  const handleRecipientDeleteClick = async (
    item: Recipient & { id: string },
  ) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${item.name}" from recipients?`,
      )
    ) {
      await loading(service.deleteRecipient(templateId, item.id))
      toast({ title: 'Recipient deleted' })
    }
  }

  const handleSelectContactsClick = async () => {
    const contacts = await selectContacts()
    if (!contacts) return

    const recipientsToAdd = contacts.map(({ name, tel }) => ({
      name: name?.[0] || '',
      contactNumber: formatTelFromContact(tel?.[0] || ''),
      labels: {},
    }))

    if (recipientsToAdd.length === 0) return

    await loading(
      service.addRecipient(
        templateId,
        recipientsToAdd[0],
        ...recipientsToAdd.slice(1),
      ),
    )
  }

  const handleImport = async (data: Record<string, unknown>[]) => {
    if (
      !window.confirm(
        `Are you sure you want to import ${data.length} recipients?`,
      )
    )
      return
    if (!data.length) return

    const recipientsToAdd = data as Recipient[]
    await loading(
      service.addRecipient(
        templateId,
        recipientsToAdd[0],
        ...recipientsToAdd.slice(1),
      ),
    )
    setShowImportCsvModal(false)
    toast({ title: `${data.length} Recipients imported` })
  }

  const handleMultipleDeleteClick = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selected.length} recipients?`,
      )
    )
      return

    await loading(
      Promise.all(
        selected.map((item) => service.deleteRecipient(templateId, item.id)),
      ),
    )
    setSelected([])
    toast({ title: 'Recipients deleted' })
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  if (templateLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ProgressCircular />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Template not found</h1>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        {template.title}
      </h1>

      <div className="flex flex-col gap-6">
        <WhatsappTemplateForm templateId={templateId} template={template} />

        <div className="flex items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-semibold">Recipients</h2>

          <div className="flex-1" />

          <div className="flex gap-2">
            <Button
              size="icon"
              onClick={() =>
                setRecipientFields({ name: '', contactNumber: '', labels: {} })
              }
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowImportCsvModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>

            {isContactSupported() && (
              <Button variant="outline" onClick={handleSelectContactsClick}>
                <Users className="h-4 w-4 mr-2" />
                Select Contacts
              </Button>
            )}

            {selected.length > 0 && (
              <Button variant="destructive" onClick={handleMultipleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selected.length})
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={
                      selected.length === recipients.length &&
                      recipients.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(recipients as any)
                      } else {
                        setSelected([])
                      }
                    }}
                  />
                </TableHead>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipientsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <ProgressCircular />
                  </TableCell>
                </TableRow>
              ) : recipients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    No recipients yet
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((row: any, index: number) => {
                  const message = compileMessage(template.message, {
                    ...row.labels,
                    id: row.id,
                    name: row.name,
                  })
                  const isSelected = selected.some((s) => s.id === row.id)

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelected([...selected, row])
                            } else {
                              setSelected(
                                selected.filter((s) => s.id !== row.id),
                              )
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        {row.contactNumber && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {[
                                row.contactNumber.slice(0, 3),
                                showContactMap[row.id]
                                  ? row.contactNumber.slice(3, 9)
                                  : '******',
                                row.contactNumber.slice(9),
                              ].join('')}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setShowContactMap({
                                  ...showContactMap,
                                  [row.id]: !showContactMap[row.id],
                                })
                              }
                            >
                              {showContactMap[row.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(row.labels || {}).map(
                            ([key, val]) => (
                              <Badge key={key} variant="secondary">
                                {key}: {val}
                              </Badge>
                            ),
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {row.contactNumber ? (
                            <Button size="sm" asChild>
                              <a
                                href={buildWhatsAppLink(
                                  row.contactNumber,
                                  message,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Send
                              </a>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(message)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setShowMessagePreview({
                                ...showMessagePreview,
                                [row.id]: !showMessagePreview[row.id],
                              })
                            }
                          >
                            Preview
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setRecipientFields(row)
                              setRecipientIdModal(row.id)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRecipientDeleteClick(row)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        {showMessagePreview[row.id] && (
                          <div className="mt-2 p-3 bg-gray-50 rounded border text-sm whitespace-pre-line">
                            {message}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recipient Form Modal */}
      {recipientFields && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <WhatsappTemplateRecipientForm
              templateId={templateId}
              id={recipientIdModal}
              value={recipientFields}
              onFinish={() => {
                setRecipientFields(undefined)
                setRecipientIdModal(undefined)
              }}
            />
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CsvImporter onImport={handleImport} />
            <div className="p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowImportCsvModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col justify-center items-center gap-2 z-50">
          <ProgressCircular />
          <div className="text-white">Loading...</div>
        </div>
      )}
    </div>
  )
}
