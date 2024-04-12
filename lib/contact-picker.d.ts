interface ContactProperties {
  [key: string]: string[];
}

interface ContactPickerSelectOptions {
  multiple?: boolean;
}

interface ContactPickerAPI {
  getProperties: Promise<string[]>;
  select: (props: string[], opts?: ContactPickerSelectOptions) => Promise<ContactProperties[]>;
}

declare global {
  interface Navigator {
    contacts: ContactPickerAPI;
  }
}

export { };
