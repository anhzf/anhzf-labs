import { useForm } from '@tanstack/react-form'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useToast } from '#/hooks/useToast'
import { useLoading } from '#/hooks/useLoading'
import { getTemplateService } from '#/modules/template/service'
import { db } from '#/lib/firebase'
import type { Recipient } from '#/modules/template/interfaces'

interface WhatsappTemplateRecipientFormProps {
  templateId: string
  id?: string
  value?: Recipient
  title?: string
  onFinish?: () => void
}

export function WhatsappTemplateRecipientForm({
  templateId,
  id,
  value = { name: '', contactNumber: '', labels: {} },
  title,
  onFinish,
}: WhatsappTemplateRecipientFormProps) {
  const { toast } = useToast()
  const [isLoading, loading] = useLoading()
  const service = getTemplateService(db)

  const form = useForm({
    defaultValues: value,
    onSubmit: async ({ value: formValue }) => {
      await loading(
        (id
          ? service.updateRecipient(templateId, id, formValue)
          : service.addRecipient(templateId, formValue)
        ).then(() => {
          toast({
            title: id ? 'Recipient updated' : 'Recipient added',
          })
          onFinish?.()
        }),
      )
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <Card className="max-w-lg">
        <CardHeader>{title || `${id ? 'Edit' : 'Add'} Recipient`}</CardHeader>
        <CardContent className="space-y-4">
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Person Name or Group Name
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />

          <form.Field
            name="contactNumber"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Contact Number</Label>
                <Input
                  id={field.name}
                  type="tel"
                  value={field.state.value || ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Required for person"
                />
              </div>
            )}
          />

          <form.Field
            name="labels"
            children={(field) => {
              const labels = field.state.value || {}
              const labelEntries = Object.entries(labels)

              return (
                <div className="space-y-3">
                  {labelEntries.concat([['', '']]).map(([key, val], i) => (
                    <div key={i} className="space-y-2">
                      <Label>Label {i + 1}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value
                            const newLabels = { ...labels }
                            if (key) delete newLabels[key]
                            if (newKey) newLabels[newKey] = val
                            field.handleChange(newLabels)
                          }}
                          placeholder={`Key of Label ${i + 1}`}
                          className="flex-1"
                        />
                        <Input
                          value={val}
                          onChange={(e) => {
                            if (key) {
                              field.handleChange({
                                ...labels,
                                [key]: e.target.value,
                              })
                            }
                          }}
                          placeholder={`Value of Label ${i + 1}`}
                          className="flex-1"
                          disabled={!key}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            }}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
