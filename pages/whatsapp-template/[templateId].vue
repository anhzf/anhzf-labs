<script lang="ts" setup>
import useTemplateStore from '~/stores/template';

const route = useRoute();
const store = useTemplateStore();

const fields = reactive({
  name: '',
  contactNumber: '',
});

const onSubmit = () => {
  console.log(fields);
  store.addRecipient(route.params.templateId as string, fields);
};
</script>

<template>
  <u-form :state="fields" @submit="onSubmit">
    <u-form-group label="Name" name="name">
      <u-input v-model="fields.name" />
    </u-form-group>

    <u-form-group label="Contact Number" name="contactNumber">
      <u-input v-model="fields.contactNumber" />
    </u-form-group>

    <u-button type="submit">Add recipient</u-button>
  </u-form>
</template>