<script lang="ts" setup generic="T">
import { nanoid } from 'nanoid';
import { parse as parseCsv } from 'csv-parse/browser/esm/sync';

interface Emits {
  (ev: 'import', data: Record<string, unknown>[]): void;
}

const parseFile = async (file: File): Promise<Record<string, unknown>[]> => {
  const content = await file.text();
  const parsed = parseCsv(content, { columns: true, trim: true, delimiter: [',', ';'] });
  return parsed;
};

const emit = defineEmits<Emits>();

const [isLoading, loading] = useLoading();

const source = ref<File>();
const data = ref<Record<string, unknown>[]>([]);
const dataCols = ref<string[]>([]);

const colNameFields = reactive({
  name: 'name',
  contactNumber: 'contactNumber',
});

const columns = computed(() => [
  { key: colNameFields.name, label: 'Name' },
  { key: colNameFields.contactNumber, label: 'Contact Number' },
  { key: 'actions', label: '' },
]);

const onFileChange = async (ev: Event) => {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  source.value = file;
};

const onImportClick = () => {
  const imported = data.value.map((row) => ({
    name: row[colNameFields.name] as string,
    contactNumber: row[colNameFields.contactNumber] as string,
  }));
  emit('import', imported);
};

const onRowDeleteClick = (id: string) => {
  const i = data.value.findIndex((row) => row.id === id);
  data.value.splice(i, 1);
};

whenever(source, async (v) => {
  data.value = (await loading(parseFile(v))).map((el) => ({ ...el, id: nanoid() }));
  dataCols.value = [...new Set(data.value.flatMap((row) => Object.keys(row)))];
});
</script>

<template>
  <u-card>
    <template #header>
      Import CSV
    </template>

    <div class="flex flex-col gap-4">
      <div class="prose prose-sm dark:prose-invert">
        <ol class="instructions">
          <li>
            <div class="flex flex-col gap-2">
              <span>Choose a file</span>
              <div class="flex gap-1.5 items-center">
                <u-button
                  icon="i-heroicons-document-arrow-up"
                  class="relative"
                >
                  Choose
                  <label class="absolute inset-0 cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      class="hidden"
                      @change="onFileChange"
                    >
                  </label>
                </u-button>

                <span v-if="source">{{ source.name }}</span>
              </div>
            </div>
          </li>

          <li>
            <div class="flex flex-col gap-2">
              <span>Define columns</span>
              <table class="not-prose">
                <tr>
                  <th>Name</th>
                  <td>
                    <u-select
                      v-model="colNameFields.name"
                      :disabled="!dataCols.length"
                      :options="[...new Set(['name', ...dataCols])]"
                    />
                  </td>
                </tr>
                <tr>
                  <th>Contact Number</th>
                  <td>
                    <u-select
                      v-model="colNameFields.contactNumber"
                      :disabled="!dataCols.length"
                      :options="[...new Set(['contactNumber', ...dataCols])]"
                    />
                  </td>
                </tr>
              </table>
            </div>
          </li>

          <li>
            <div class="flex flex-col gap-2">
              <span>Preview your data</span>
              <u-table
                :columns="columns"
                :rows="data"
                :loading="isLoading"
                class="not-prose overflow-auto max-h-[40vh]"
              >
                <template #actions-data="{row}">
                  <u-button
                    icon="i-heroicons-trash"
                    variant="ghost"
                    square
                    color="red"
                    @click="onRowDeleteClick(row.id)"
                  />
                </template>
              </u-table>
              <div class="flex">
                <div class="grow" />
                <small>{{ data.length }} rows</small>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <template #footer>
      <div class="flex">
        <div class="grow" />

        <u-button
          label="Import"
          color="primary"
          :disabled="!data.length"
          @click="onImportClick"
        />
      </div>
    </template>
  </u-card>
</template>
