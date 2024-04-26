import crypto from 'node:crypto';
import { sortObjectByKey } from "./sortObjectByKey";
import { objectToQueryString } from "./objectToQueryString";
import type { CheckoutResponseDataType, DataType, PaymentLinkDataType, CheckoutRequestType, WebhookDataType } from "../types";

export const createSignatureFromObject = (data: DataType<CheckoutResponseDataType | PaymentLinkDataType | WebhookDataType>, key: string): string | null => {
  if (!data || !key.length) return null;
  const sortedData = sortObjectByKey(data);
  const queryString = objectToQueryString(sortedData);
  const dataToSignature = crypto.createHmac('sha256', key).update(queryString).digest('hex');
  return dataToSignature;
}

export const createSignatureOfPaymentRequest = (data: DataType<CheckoutRequestType>, key: string): string | null => {
  if (!data || !key.length) return null;
  const amount = data.amount, cancelUrl = data.cancelUrl, description = data.description, orderCode = data.orderCode, returnUrl = data.returnUrl;
  const queryString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  const dataToSignature = crypto.createHmac('sha256', key).update(queryString).digest('hex');
  return dataToSignature;
}