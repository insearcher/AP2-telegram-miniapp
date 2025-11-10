/**
 * TypeScript version of W3C Payment Request API types
 *
 * Source: ../../src/ap2/types/payment_request.py
 * Last synced: 2025-11-10
 *
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0
 *
 * The Agent Payments Protocol utilizes several objects from this API.
 *
 * Specification: https://www.w3.org/TR/payment-request/
 */

import type { ContactAddress } from './contactPicker';

export const PAYMENT_METHOD_DATA_DATA_KEY = "payment_request.PaymentMethodData";

/**
 * A PaymentCurrencyAmount is used to supply monetary amounts.
 *
 * Source: payment_request.py:34-44
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentcurrencyamount
 */
export interface PaymentCurrencyAmount {
  /** The three-letter ISO 4217 currency code. */
  currency: string;
  /** The monetary value. */
  value: number;
}

/**
 * An item for purchase and the value asked for it.
 *
 * Source: payment_request.py:47-65
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentitem
 */
export interface PaymentItem {
  /** A human-readable description of the item. */
  label: string;
  /** The monetary amount of the item. */
  amount: PaymentCurrencyAmount;
  /** If true, indicates the amount is not final. */
  pending?: boolean;
  /** The refund duration for this item, in days. */
  refund_period?: number;
}

/**
 * Describes a shipping option.
 *
 * Source: payment_request.py:68-86
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentshippingoption
 */
export interface PaymentShippingOption {
  /** A unique identifier for the shipping option. */
  id: string;
  /** A human-readable description of the shipping option. */
  label: string;
  /** The cost of this shipping option. */
  amount: PaymentCurrencyAmount;
  /** If true, indicates this as the default option. */
  selected?: boolean;
}

/**
 * Information about the eligible payment options for the payment request.
 *
 * Source: payment_request.py:89-114
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentoptions
 */
export interface PaymentOptions {
  /** Indicates if the payer's name should be collected. */
  request_payer_name?: boolean;
  /** Indicates if the payer's email should be collected. */
  request_payer_email?: boolean;
  /** Indicates if the payer's phone number should be collected. */
  request_payer_phone?: boolean;
  /** Indicates if the payer's shipping address should be collected. */
  request_shipping?: boolean;
  /** Can be 'shipping', 'delivery', or 'pickup'. */
  shipping_type?: string;
}

/**
 * Indicates a payment method and associated data specific to the method.
 *
 * For example:
 * - A card may have a processing fee if it is used.
 * - A loyalty card may offer a discount on the purchase.
 *
 * Source: payment_request.py:117-133
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentmethoddata
 */
export interface PaymentMethodData {
  /** A string identifying the payment method. */
  supported_methods: string;
  /** Payment method specific details. */
  data?: Record<string, any>;
}

/**
 * Provides details that modify the payment details based on a payment method.
 *
 * Source: payment_request.py:136-157
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentdetailsmodifier
 */
export interface PaymentDetailsModifier {
  /** The payment method ID that this modifier applies to. */
  supported_methods: string;
  /** A PaymentItem value that overrides the original item total. */
  total?: PaymentItem;
  /** Additional PaymentItems applicable for this payment method. */
  additional_display_items?: PaymentItem[];
  /** Payment method specific data for the modifier. */
  data?: Record<string, any>;
}

/**
 * Contains the details of the payment being requested.
 *
 * Source: payment_request.py:160-181
 * Specification: https://www.w3.org/TR/payment-request/#dom-paymentdetailsinit
 */
export interface PaymentDetailsInit {
  /** A unique identifier for the payment request. */
  id: string;
  /** A list of payment items to be displayed to the user. */
  display_items: PaymentItem[];
  /** A list of available shipping options. */
  shipping_options?: PaymentShippingOption[];
  /** A list of price modifiers for particular payment methods. */
  modifiers?: PaymentDetailsModifier[];
  /** The total payment amount. */
  total: PaymentItem;
}

/**
 * A request for payment.
 *
 * Source: payment_request.py:184-201
 * Specification: https://www.w3.org/TR/payment-request/#paymentrequest-interface
 */
export interface PaymentRequest {
  /** A list of supported payment methods. */
  method_data: PaymentMethodData[];
  /** The financial details of the transaction. */
  details: PaymentDetailsInit;
  /** Payment options. */
  options?: PaymentOptions;
  /** The user's provided shipping address. */
  shipping_address?: ContactAddress;
}

/**
 * Indicates a user has chosen a payment method & approved a payment request.
 *
 * Source: payment_request.py:204-229
 * Specification: https://www.w3.org/TR/payment-request/#paymentresponse-interface
 */
export interface PaymentResponse {
  /** The unique ID from the original PaymentRequest. */
  request_id: string;
  /** The payment method chosen by the user. */
  method_name: string;
  /**
   * A dictionary generated by a payment method that a merchant can use
   * to process a transaction. The contents will depend upon the payment
   * method.
   */
  details?: Record<string, any>;
  shipping_address?: ContactAddress;
  shipping_option?: PaymentShippingOption;
  payer_name?: string;
  payer_email?: string;
  payer_phone?: string;
}
