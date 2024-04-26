import type {
  CancelPaymentLinkResponseType,
  CheckoutRequestType,
  CheckoutResponseDataType,
  CreatePaymentLinkResponseType,
  GetPaymentLinkInformationResponseType,
  PaymentLinkDataType,
  WebhookDataType,
  WebhookType
} from "./types";
import { createSignatureFromObject, createSignatureOfPaymentRequest } from "./utils/createSignature";
import { PayOSError } from "./error";
import { ERROR_CODE, ERROR_MESSAGE, PAYOS_API_URL } from "./constants";


export default class PayOS {
  private clientId: string;
  private apiKey: string;
  private checksumKey: string;

  /**
   * Create a payOS object to use payment channel methods. Credentials are fields provided after creating a payOS payment channel
   * @param {string} clientId Client ID of the payOS payment channel
   * @param {string} apiKey Api Key of the payOS payment channel
   * @param {string} checksumKey Checksum Key of the payOS payment channel
   */
  constructor(clientId: string, apiKey: string, checksumKey: string) {
    this.clientId = clientId;
    this.apiKey = apiKey;
    this.checksumKey = checksumKey;
  }

  /**
   * Create a payment link for the order data passed in the parameter
   * @param {CheckoutRequestType} paymentData Payment data
   */
  public async createPaymentLink(paymentData: CheckoutRequestType): Promise<CheckoutResponseDataType> {
    if (!paymentData || !paymentData.amount || !paymentData.cancelUrl || !paymentData.description || !paymentData.orderCode || !paymentData.returnUrl) {
      const requiredFields = ["amount", "cancelUrl", "description", "orderCode", "returnUrl"];
      const keysError = requiredFields.filter((key) => !paymentData[key as keyof CheckoutRequestType]);
      throw new Error(`The following fields are required: ${keysError.join(", ")}`);
    }
    const url = `${PAYOS_API_URL}/v2/payment-requests`;
    const signature = createSignatureOfPaymentRequest(paymentData, this.checksumKey);
    try {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ ...paymentData, signature }),
        headers: {
          'content-type': 'application/json',
          'X-client-id': this.clientId,
          'X-api-key': this.apiKey,
        }
      });
      const { code, data, signature: resSignature, desc }: CreatePaymentLinkResponseType = await response.json();
      if (code === "00") {
        const paymentLinkResSignature = createSignatureFromObject(data, this.checksumKey);
        if (paymentLinkResSignature !== resSignature) {
          throw new Error(ERROR_MESSAGE.DATA_NOT_INTEGRITY);
        }
        if (data) return data;
      }
      throw new PayOSError({ code: code, message: desc });
    } catch (error) {
      const errorData = (error as any)?.response?.data || (error as any)?.response || error;
      throw new Error((errorData)?.message || errorData);
    }
  }

  /**
   * Get payment information of an order that has created a payment link
   * @param {number | string} orderId Order Id
   */
  public async getPaymentLinkInformation(orderId: string | number): Promise<PaymentLinkDataType> {
    if (!orderId || (typeof orderId == 'number' && (!Number.isInteger(orderId) || orderId <= 0)) || (typeof orderId == 'string' && orderId.length == 0)) {
      throw new Error(ERROR_MESSAGE.INVALID_PARAMETER);
    }
    const url = `${PAYOS_API_URL}/v2/payment-requests/${orderId}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-client-id": this.clientId,
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        }
      });
      const { code, data, signature, desc }: GetPaymentLinkInformationResponseType = await response.json();
      if (code == "00") {
        const paymentLinkInfoResSignature = createSignatureFromObject(data, this.checksumKey);
        if (paymentLinkInfoResSignature !== signature) {
          throw new Error(ERROR_MESSAGE.DATA_NOT_INTEGRITY);
        }
        if (data) return data;
      }
      throw new PayOSError({ code: code, message: desc });
    } catch (error) {
      const errorData = (error as any)?.response?.data || (error as any)?.response || error;
      throw new Error((errorData)?.message || errorData);
    }
  }

  /**
   * Validate the Webhook URL of a payment channel and add or update the Webhook URL for that Payment Channel if successful.
   * @param {string} webhookUrl Your Webhook URL
   */
  public async confirmWebhook(webhookUrl: string): Promise<string> {
    if (!webhookUrl || webhookUrl.length == 0) {
      throw new Error(ERROR_MESSAGE.INVALID_PARAMETER);
    }
    const url = `${PAYOS_API_URL}/confirm-webhook`;
    try {
      await fetch(url, {
        method: "POST",
        body: JSON.stringify({ webhookUrl }),
        headers: {
          "x-client-id": this.clientId,
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        }
      });
      return webhookUrl;
    } catch (error) {
      const errorData = (error as any)?.response?.data || (error as any)?.response || error;
      if (errorData?.status === 400) {
        throw new PayOSError({ code: ERROR_CODE.INTERNAL_SERVER_ERROR, message: ERROR_MESSAGE.WEBHOOK_URL_INVALID })
      } else if (errorData?.status === 401) {
        throw new PayOSError({ code: ERROR_CODE.UNAUTHORIZED, message: ERROR_MESSAGE.UNAUTHORIZED })
      } else if (String(errorData?.status).startsWith('5')) {
        throw new PayOSError({ code: ERROR_CODE.INTERNAL_SERVER_ERROR, message: ERROR_MESSAGE.INTERNAL_SERVER_ERROR })
      }
      throw new Error(errorData?.message || errorData);
    }
  }
  /**
   * Cancel the payment link of the order
   * @param {number | string} orderId Order ID
   * @param {string} cancellationReason Reason for canceling payment link (optional)
   */
  public async cancelPaymentLink(orderId: string | number, cancellationReason?: string): Promise<PaymentLinkDataType> {
    if (!orderId || (typeof orderId == 'number' && (!Number.isInteger(orderId) || orderId <= 0)) || (typeof orderId == 'string' && orderId.length == 0)) {
      throw new Error(ERROR_MESSAGE.INVALID_PARAMETER);
    }

    const url = `${PAYOS_API_URL}/v2/payment-requests/${orderId}/cancel`;

    try {
      const response = await fetch(url, {
        method: "POST",
        body: cancellationReason ? JSON.stringify({ cancellationReason }) : undefined,
        headers: {
          "x-client-id": this.clientId,
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        }
      });
      const { code, data, signature, desc }: CancelPaymentLinkResponseType = await response.json();
      if (code == "00") {
        const paymentLinkInfoResSignature = createSignatureFromObject(data, this.checksumKey);
        if (paymentLinkInfoResSignature !== signature) {
          throw new Error(ERROR_MESSAGE.DATA_NOT_INTEGRITY);
        }
        if (data) return data;
      }
      throw new PayOSError({ code: code, message: desc });
    } catch (error) {
      const errorData = (error as any)?.response?.data || (error as any)?.response || error;
      throw new Error((errorData)?.message || errorData);
    }
  }

  /**
   * Verify data received via webhook after payment
   * @param webhookBody Request body received from webhook
   * @return {WebhookDataType} Payment data if payment data is valid, otherwise returns null
   */
  public verifyWebhookData(webhookBody: WebhookType): WebhookDataType | null {
    const data = webhookBody.data, signature = webhookBody.signature;
    if (!data) throw new Error(ERROR_MESSAGE.NO_DATA);
    const signData = createSignatureFromObject(data, this.checksumKey);
    if (signData !== signature) throw new Error(ERROR_MESSAGE.DATA_NOT_INTEGRITY);
    return data;
  }
}

export { PayOS };