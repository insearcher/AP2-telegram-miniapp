/**
 * TypeScript version of W3C Contact Picker API types
 *
 * Source: ../../src/ap2/types/contact_picker.py
 * Last synced: 2025-11-10
 *
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0
 *
 * Specification: https://www.w3.org/TR/contact-picker/
 */

export const CONTACT_ADDRESS_DATA_KEY = "contact_picker.ContactAddress";

/**
 * The ContactAddress interface represents a physical address.
 *
 * Source: contact_picker.py:33-49
 * Specification: https://www.w3.org/TR/contact-picker/#contact-address
 */
export interface ContactAddress {
  city?: string;
  country?: string;
  dependent_locality?: string;
  organization?: string;
  phone_number?: string;
  postal_code?: string;
  recipient?: string;
  region?: string;
  sorting_code?: string;
  address_line?: string[];
}
