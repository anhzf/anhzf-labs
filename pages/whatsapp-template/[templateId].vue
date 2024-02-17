<script lang="ts" setup>
import type { Input } from 'valibot';
import { collection } from 'firebase/firestore';
import { OnClickOutside } from '@vueuse/components';
import type { FormSubmitEvent } from '#ui/types';
import { RecipientSchema } from '~/modules/template/schemas';
import { buildWhatsAppLink, compileMessage } from '~/modules/template/utils';
import type { InTemplate } from '~/modules/template/interfaces';
import useTemplateStore from '~/stores/template';
import { useLoading } from '~/composables/useLoading';

const store = useTemplateStore();
await store.ensureTemplate();

if (!store.template) throw createError({ statusCode: 404 });

const columns = [
  {
    key: 'number',
    label: '#',
  },
  {
    key: 'name',
    label: 'Name',
  },
  {
    key: 'contactNumber',
    label: 'Contact Number',
  },
  {
    key: 'labels',
    label: 'Labels',
  },
  {
    key: 'id',
    label: 'Actions',
  },
];

const toast = useToast();

const recipientsRoot = computed(() => (store.ref ? collection(store.ref, 'recipients') : null));
const recipients = useCollection(recipientsRoot);
const rows = computed(() => recipients.value.map((recipient, index) => ({
  ...recipient,
  number: index + 1,
  id: recipient.id,
})));

const { isLoading, loading } = useLoading();

const templateFields = reactive({
  message: store.template.message,
});

const recipientFields = reactive({
  name: '',
  contactNumber: '',
});

const onTemplateSubmit = async (ev: FormSubmitEvent<Pick<InTemplate, 'message'>>) => {
  await loading(store.update(ev.data));
  toast.add({ title: 'Template updated' });
};

const onRecipientSubmit = async (ev: FormSubmitEvent<Input<typeof RecipientSchema>>) => {
  await loading(store.addRecipient(ev.data));
  toast.add({ title: 'Recipient added' });
};

const onRecipientDeleteClick = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this recipient?')) {
    await loading(store.deleteRecipient(id));
    toast.add({ title: 'Recipient deleted' });
  }
};
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
      {{ store.template?.title }}
    </h1>

    <div class="flex flex-col">
      <div class="flex gap-6">
        <u-form
          :state="templateFields"
          class="grow"
          @submit="onTemplateSubmit"
        >
          <u-form-group
            label="Message Template"
            name="message"
          >
            <u-textarea
              v-model="templateFields.message"
              :rows="5"
            />
          </u-form-group>

          <u-button
            type="submit"
            :loading="isLoading"
          >
            Save
          </u-button>
        </u-form>

        <u-form
          :state="recipientFields"
          :schema="RecipientSchema"
          class="grow max-w-lg"
          @submit="onRecipientSubmit"
        >
          <u-form-group
            label="Name"
            name="name"
          >
            <u-input v-model="recipientFields.name" />
          </u-form-group>

          <u-form-group
            label="Contact Number"
            name="contactNumber"
          >
            <u-input
              v-model="recipientFields.contactNumber"
              type="tel"
            />
          </u-form-group>

          <u-button
            type="submit"
            icon="i-heroicons-plus"
            :loading="isLoading"
          >
            Add Recipient
          </u-button>
        </u-form>
      </div>

      <h2 class="text-2xl sm:text-3xl">
        Recipients
      </h2>

      <u-table
        :columns="columns"
        :rows="rows"
      >
        <template #contactNumber-data="{row}">
          <define-state
            :val="false"
            #="{state: showContact, setState}"
          >
            <on-click-outside @trigger="setState(false)">
              <div class="flex items-center gap-2">
                <div>
                  {{ [
                    row.contactNumber.slice(0, 3),
                    showContact ? row.contactNumber.slice(3, 9) : '******',
                    row.contactNumber.slice(9),
                  ].join('') }}
                </div>
                <u-button
                  :icon="showContact ? 'i-heroicons-eye-slash':'i-heroicons-eye'"
                  variant="ghost"
                  square
                  dynamic
                  color="gray"
                  @click="setState(!showContact)"
                />
              </div>
            </on-click-outside>
          </define-state>
        </template>

        <template #labels-data="{row}">
          <div>
            <u-badge
              v-for="(label, key) in row.labels"
              :key="key"
              :label="`${key}: ${label}`"
              variant="soft"
            />
          </div>
        </template>

        <template #id-data="{row}">
          <define-state
            :val="compileMessage(store.template!.message, {...row.labels, id: row.id, name: row.name})"
            #="{state: message}"
          >
            <div class="flex gap-4">
              <u-button
                icon="i-mdi-whatsapp"
                :to="buildWhatsAppLink(row.contactNumber, message)"
                target="_blank"
              >
                Send
              </u-button>

              <u-popover mode="hover">
                <u-button variant="link">
                  Preview
                </u-button>

                <template #panel>
                  <u-card>
                    <template #header>
                      <div class="font-bold">
                        {{ row.name }}
                      </div>
                    </template>

                    <div class="whitespace-pre-line">
                      {{ message }}
                    </div>
                  </u-card>
                </template>
              </u-popover>

              <u-button
                icon="i-heroicons-pencil"
                variant="ghost"
              />

              <u-button
                icon="i-heroicons-trash"
                variant="ghost"
                color="red"
                @click="onRecipientDeleteClick(row.id)"
              />
            </div>
          </define-state>
        </template>
      </u-table>
    </div>
  </div>
</template>
