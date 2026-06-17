// Contact Picker API TypeScript declarations

interface ContactAddress {
  city?: string
  country?: string
  dependentLocality?: string
  organization?: string
  phone?: string
  postalCode?: string
  recipient?: string
  region?: string
  sortingCode?: string
  addressLine?: string[]
}

interface ContactInfo {
  address?: ContactAddress[]
  email?: string[]
  icon?: Blob[]
  name?: string[]
  tel?: string[]
}

interface ContactsManager {
  select: (
    properties: string[],
    options?: { multiple?: boolean },
  ) => Promise<ContactInfo[]>
  getProperties: () => Promise<string[]>
}

interface Navigator {
  contacts?: ContactsManager
}
