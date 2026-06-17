import { useForm } from '@tanstack/react-form';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardFooter } from '#/components/ui/card';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import { useToast } from '#/hooks/useToast';
import { useLoading } from '#/hooks/useLoading';
import { getTemplateService } from '#/modules/template/service';
import { db } from '#/lib/firebase';
import type { Template } from '#/modules/template/interfaces';

interface WhatsappTemplateFormProps {
  templateId: string;
  template: (Template & { id: string }) | null;
  onFinish?: () => void;
}

export function WhatsappTemplateForm({
  templateId,
  template,
  onFinish,
}: WhatsappTemplateFormProps) {
  const { toast } = useToast();
  const [isLoading, loading] = useLoading();
  const service = getTemplateService(db);

  const form = useForm({
    defaultValues: {
      message: template?.message || '',
    },
    onSubmit: async ({ value }) => {
      await loading(
        service.update(templateId, { message: value.message }).then(() => {
          toast({
            title: 'Template updated',
          });
          onFinish?.();
        })
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Card>
        <CardContent className="pt-6">
          <form.Field
            name="message"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Message Template
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={5}
                  className="resize-y"
                />
                {field.state.meta.errors ? (
                  <p className="text-sm text-red-500">
                    {field.state.meta.errors.join(', ')}
                  </p>
                ) : null}
              </div>
            )}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
