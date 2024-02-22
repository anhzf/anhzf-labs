<!-- TODO: Work for other utilities, not for recipients only.
  It receives input wanted columns, and wether to add rest columns as labels or related. -->
<script lang="ts" setup generic="T">
import { nanoid } from 'nanoid';
import { parse as parseCsv } from 'csv-parse/browser/esm/sync';
import { excludes } from '~/utils/array';

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
const includeAsLabels = ref<string[]>([]);

const columns = computed(() => [
  { key: colNameFields.name, label: 'Name' },
  { key: colNameFields.contactNumber, label: 'Contact Number' },
  { key: 'labels', label: 'Labels' },
  { key: 'actions', label: '' },
]);

const onFileChange = async (ev: Event) => {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  source.value = file;
};

const onImportClick = () => {
  const imported = data.value.map(({
    [colNameFields.name]: name,
    [colNameFields.contactNumber]: contactNumber,
    ...cols
  }) => ({
    name,
    contactNumber,
    labels: Object.fromEntries(
      Object.entries(cols).filter(([k]) => includeAsLabels.value.includes(k)),
    ),
  }));
  emit('import', imported);
};

const onRowDeleteClick = (id: string) => {
  const i = data.value.findIndex((row) => row.$id === id);
  data.value.splice(i, 1);
};

whenever(source, async (v) => {
  const parsed = await loading(parseFile(v));
  data.value = parsed.map((el) => ({ ...el, $id: nanoid() }));
  dataCols.value = [...new Set(parsed.flatMap((row) => Object.keys(row)))];
});

watch(() => [colNameFields.name, colNameFields.contactNumber], (v) => {
  includeAsLabels.value = excludes(includeAsLabels.value, ...v);
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
                  <th class="w-[18ch] leading-none py-[.25em]">
                    Name
                  </th>
                  <td>
                    <u-select
                      v-model="colNameFields.name"
                      :disabled="!dataCols.length"
                      :options="[...new Set(['name', ...dataCols])]"
                    />
                  </td>
                </tr>
                <tr>
                  <th class="w-[18ch] leading-none py-[.25em]">
                    Contact Number
                  </th>
                  <td>
                    <u-select
                      v-model="colNameFields.contactNumber"
                      :disabled="!dataCols.length"
                      :options="[...new Set(['contactNumber', ...dataCols])]"
                    />
                  </td>
                </tr>
                <tr>
                  <th class="w-[18ch] leading-none py-[.25em]">
                    Add Labels from
                  </th>
                  <td>
                    <div class="flex gap-1">
                      <u-checkbox
                        v-for="(prop) in excludes(dataCols, colNameFields.name, colNameFields.contactNumber)"
                        :key="prop"
                        :label="prop"
                        :model-value="includeAsLabels.includes(prop)"
                        @update:model-value="$event
                          ? includeAsLabels.push(prop)
                          : includeAsLabels.splice(includeAsLabels.indexOf(prop), 1)"
                      />
                    </div>
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
                <template #labels-data="{row}">
                  <div class="flex gap-1 flex-wrap max-w-[36ch]">
                    <u-badge
                      v-for="(label, key) in Object.fromEntries(
                        Object.entries(row).filter(([k]) => includeAsLabels.includes(k))
                      )"
                      :key="key"
                      :label="`${key}: ${label}`"
                      variant="soft"
                      size="xs"
                    />
                  </div>
                </template>

                <template #actions-data="{row}">
                  <u-button
                    icon="i-heroicons-trash"
                    variant="ghost"
                    square
                    color="red"
                    @click="onRowDeleteClick(row.$id)"
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
