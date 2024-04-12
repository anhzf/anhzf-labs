<script lang="ts" setup>
import { OnClickOutside } from '@vueuse/components';
import { collection } from 'firebase/firestore';
import { useLoading } from '~/composables/useLoading';
import type { HasId } from '~/lib/types';
import type { InRecipient, OutRecipient } from '~/modules/template/interfaces';
import { buildWhatsAppLink, compileMessage } from '~/modules/template/utils';
import useTemplateStore from '~/stores/template';

const isContactSupported = () => 'contacts' in window.navigator;
const selectContacts = () => navigator.contacts.select(['name', 'tel'], { multiple: true });

/**
 * Expect from 081234567890 to 6281234567890
 * or remove +, - and ()
 */
const formatTelFromContact = (tel: string) => {
  if (tel.startsWith('08')) return `62${tel.slice(1)}`;
  if (tel.startsWith('+')) return tel.replace(/\D/g, '');
  return tel;
};

const store = useTemplateStore();
await store.ensureTemplate();

if (!store.template) throw createError({ statusCode: 404 });

const columns = [
  { key: 'number', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'labels', label: 'Labels' },
  { key: 'id', label: 'Actions' },
];

const toast = useToast();
const { copy } = useClipboard();

const recipientsRoot = computed(() => (store.ref ? collection(store.ref, 'recipients') : null));
const { data: recipients, pending: recipientsPending } = useCollection(recipientsRoot);
const rows = computed(() => recipients.value.map((recipient, index) => ({
  ...recipient,
  number: index + 1,
  id: recipient.id,
})));

const [isLoading, loading] = useLoading();

const recipientFields = ref<InRecipient>();
const recipientIdModal = ref<string>();
const showImportCsvModal = ref(false);
const selected = ref<(OutRecipient & HasId)[]>([]);

const onRecipientDeleteClick = async (item: OutRecipient & HasId) => {
  if (window.confirm(`Are you sure you want to delete "${item.name}" from recipients?`)) {
    await loading(store.deleteRecipient(item.id));
    toast.add({ title: 'Recipient deleted' });
  }
};

const onSelectContactsClick = async () => {
  const contacts = await selectContacts();

  await loading(store.addRecipient(...contacts.map(({ name, tel }) => ({
    name: name[0],
    contactNumber: formatTelFromContact(tel[0]),
  })) as [InRecipient, ...InRecipient[]]));
};

const onImport = async (data: Record<string, unknown>[]) => {
  if (!window.confirm(`Are you sure you want to import ${data.length} recipients?`)) return;

  if (!data.length) return;

  await loading(store.addRecipient(...data as [InRecipient, ...InRecipient[]]));
  showImportCsvModal.value = false;
  toast.add({ title: `${data.length} Recipients imported` });
};

const onMultipleDeleteClick = async () => {
  if (!window.confirm(`Are you sure you want to delete ${selected.value.length} recipients?`)) return;

  await loading(Promise.all(selected.value.map((item) => store.deleteRecipient(item.id))));
  selected.value = [];
  toast.add({ title: 'Recipients deleted' });
};
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
      {{ store.template?.title }}
    </h1>

    <div class="flex flex-col">
      <whatsapp-template-form />

      <div class="flex items-center gap-4">
        <h2 class="text-2xl sm:text-3xl">
          Recipients
        </h2>

        <div class="grow" />

        <div class="flex gap-1.5">
          <u-button
            icon="i-heroicons-plus"
            @click="recipientFields = { name: '', contactNumber: '' }"
          />

          <u-button
            label="Import"
            icon="i-heroicons-document-arrow-down"
            variant="outline"
            @click="showImportCsvModal = true"
          />

          <u-button
            v-if="isContactSupported()"
            label="Select Contacts"
            icon="i-heroicons-user-group"
            variant="outline"
            @click="onSelectContactsClick"
          />

          <template v-if="selected.length">
            <u-button
              label="Delete"
              icon="i-heroicons-trash"
              color="red"
              @click="onMultipleDeleteClick"
            />
          </template>
        </div>
      </div>

      <u-table
        v-model="selected"
        :columns="columns"
        :rows="rows"
        :loading="recipientsPending"
      >
        <template #contactNumber-data="{ row }">
          <define-state
            :val="false"
            #="{ state: showContact, setState }"
          >
            <on-click-outside @trigger="setState(false)">
              <div class="flex items-center gap-2">
                <div class="w-[13ch]">
                  {{ [
                    row.contactNumber.slice(0, 3),
                    showContact ? row.contactNumber.slice(3, 9) : '******',
                    row.contactNumber.slice(9),
                  ].join('') }}
                </div>
                <u-button
                  :icon="showContact ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
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

        <template #labels-data="{ row }">
          <div class="flex gap-1">
            <u-badge
              v-for="(label, key) in row.labels"
              :key="key"
              :label="`${key}: ${label}`"
              variant="soft"
            />
          </div>
        </template>

        <template #id-data="{ row }">
          <define-state
            :val="compileMessage(store.template!.message, { ...row.labels, id: row.id, name: row.name })"
            #="{ state: message }"
          >
            <div class="flex gap-4">
              <u-button
                v-if="row.contactNumber"
                label="Send"
                icon="i-mdi-whatsapp"
                :to="buildWhatsAppLink(row.contactNumber, message)"
                target="_blank"
              />

              <u-button
                v-else
                label="Copy"
                icon="i-mdi-content-copy"
                title="Copy message"
                @click="copy(message).then(() => toast.add({ title: 'Copied to clipboard' }))"
              />

              <u-popover
                mode="click"
                class="max-w-[max(65ch,96vw)]"
              >
                <u-button
                  label="Preview"
                  variant="link"
                />

                <template #panel>
                  <u-card>
                    <template #header>
                      <div class="flex items-center gap-2">
                        <u-button
                          icon="i-heroicons-clipboard"
                          variant="soft"
                          @click="copy(message).then(() => toast.add({ title: 'Copied to clipboard' }))"
                        />
                        <div class="font-bold">
                          Preview Message
                        </div>
                      </div>
                    </template>

                    <div class="whitespace-pre-line overflow-x-auto">
                      {{ message }}
                    </div>
                  </u-card>
                </template>
              </u-popover>

              <u-button
                icon="i-heroicons-pencil"
                variant="ghost"
                @click="(recipientFields = row, recipientIdModal = row.id)"
              />

              <u-button
                icon="i-heroicons-trash"
                variant="ghost"
                color="red"
                @click="onRecipientDeleteClick(row)"
              />
            </div>
          </define-state>
        </template>
      </u-table>
    </div>

    <u-modal
      :model-value="!!recipientFields"
      @update:model-value="recipientFields = $event ? recipientFields : undefined"
    >
      <whatsapp-template-recipient-form
        :id="recipientIdModal"
        :value="recipientFields"
        @finish="(recipientFields = undefined, recipientIdModal = undefined)"
      />
    </u-modal>

    <u-modal
      v-model="showImportCsvModal"
      :ui="{ width: 'sm:max-w-xl' }"
    >
      <csv-importer @import="onImport" />
    </u-modal>

    <div
      v-if="isLoading"
      class="fixed inset-0 bg-slate-900/50 flex flex-col justify-center items-center gap-2"
    >
      <progress-circular class="text-3xl" />
      <div>Loading...</div>
    </div>
  </div>
</template>
