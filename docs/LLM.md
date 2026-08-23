# How Managed Payments works

Learn how to use Managed Payments to sell digital products globally.

Use Managed Payments with [Stripe Checkout](https://docs.stripe.com/payments/checkout/how-checkout-works.md) or [Payment Links](https://docs.stripe.com/payment-links.md) to sell digital products such as SaaS, software, and digital content or downloads, without operating local business entities in each country where you sell your products.

Managed Payments is the Stripe merchant of record solution that handles the following for you:

|  |
|  |
| **Sales tax, VAT, and GST compliance**     | Managed Payments handles [indirect tax compliance](https://docs.stripe.com/payments/managed-payments/tax-compliance.md) on sales to customers in more than 80 countries. It calculates and collects tax based on product classification and customer location, then files and remits payments to the relevant tax authorities. For transactions in countries where Managed Payments doesn’t handle indirect tax compliance, you remain responsible for compliance. You can use [Stripe Tax](https://docs.stripe.com/tax.md) to calculate tax for those transactions at no additional charge. |
| **Checkout optimizations**                 | Managed Payments checkout pages use [Link](https://docs.stripe.com/payments/link.md) for the transaction, which allows your customers to reuse their saved payment details. [Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md) is enabled by default, so customers can pay in their local currency and with their preferred [local payment method](https://docs.stripe.com/payments/managed-payments/how-it-works.md#payment-method-availability).                                                                                          |
| **Transaction-related emails**             | Stripe automatically sends receipts, invoices, refunds, and certain subscription-related emails directly to customers from Link.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Customer order and transaction support** | Customers can manage orders through [Link](https://app.link.com). Link also handles transaction-level support and might contact you when needed. You retain full visibility and control for product-level support. You can issue refunds and update subscriptions in the Dashboard or with the API.                                                                                                                                                                                                                                                                                          |
| **Fraud prevention**                       | Stripe uses AI and real-time monitoring to [manage fraud](https://docs.stripe.com/radar.md). No action is needed from you because Stripe configures the rules and maintains blocklists.                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Dispute management**                     | Stripe handles disputes for you. We use both automated and manual processes to review and handle each dispute, including submitting evidence on your behalf.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Managed Payments customer flow

For Managed Payments transactions, customers interact with Link at checkout, on receipts, and for post-purchase support. The customer sees Link as the merchant of record, and sees purchases as *[Sold through Link](https://support.link.com/topics/sold-through-link)*.

### The customer checks out

Stripe uses [Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md) to automatically convert prices into the customer’s local currency based on their location.

At checkout, customers can pay with [cards](https://docs.stripe.com/payments/cards.md), [Apple Pay](https://docs.stripe.com/apple-pay.md), [Google Pay](https://docs.stripe.com/google-pay.md), or [Link](https://support.link.com/questions/what-is-link), and select *local payment methods* (Payment methods used in specific countries or regions, such as bank transfers, vouchers, and digital wallets. Examples include Pix (Brazil, bank transfers), Konbini (Japan, vouchers), and WeChat Pay (China, digital wallet)). Customers can use an existing Link account, create a new one during checkout, or check out as a guest.

The checkout page footer displays standardized payment terms. You can add a custom terms of service and privacy policy in your [Checkout settings](https://dashboard.stripe.com/settings/checkout).
![A checkout page using Managed Payments](https://b.stripecdn.com/docs-statics-srv/assets/checkout-session.b964acf452ecb2f0f0555ab9c92c810f.png)

When the payment completes, Stripe withholds the indirect taxes (sales tax, VAT, and GST) when applicable.

> Custom domains aren’t supported on Managed Payments checkouts.

### After the payment

Stripe always sends receipts, invoices, and any refund or credit note notifications directly to the customer after payment. PDF versions of receipts and invoices are always attached.

These emails are sent from Link. Your [receipt settings](https://dashboard.stripe.com/settings/emails) in the Dashboard don’t affect these emails.

### Subscription-related email notifications

Stripe always sends certain subscription-related emails to customers from Link, including:

- A trial start email that confirms the subscription.
- A trial ending reminder. Stripe sends this in addition to the trial start email for all trials longer than 7 days. The Dashboard setting for trial ending emails doesn’t apply to these emails.

You can control emails for upcoming renewals, expired cards, and failed payments in the [subscriptions and email settings](https://dashboard.stripe.com/settings/billing/subscriptions) in the Dashboard.

If you enable **Upcoming renewals**, Stripe sends an email before every subscription renewal.

If you disable this setting, Stripe still sends an upcoming renewal email as follows:

- Before the subscription’s 6-month and 12-month anniversary to customers in Australia and the United Kingdom
- Before the subscription’s 12-month anniversary or as required by local law for customers in all other countries
- 30 days before the next renewal date (or as required by local law) for subscriptions that renew monthly or less frequently (for example, annually)
- 7 days before the next renewal date for subscriptions that renew less frequently than monthly

### Statement descriptor

The customer’s statement displays `LINK.COM* [Your statement descriptor]`, as defined by the [statement descriptor logic](https://docs.stripe.com/get-started/account/statement-descriptors.md).

### Manage orders

When you use Managed Payments, your customers automatically have access to the [Link website](https://link.com) to manage the following for their orders:

- View order history
- Cancel or update subscriptions
- Update payment methods
- Update billing address

Customers that check out as a guest receive a prompt to create a Link account to access these order management tools.

You can also offer additional subscription management from your own website using the Customer Portal or your own solution.

### Transaction support

Stripe handles payment and subscription-related support requests through [Link support](https://support.link.com/topics/sold-through-link). Stripe might contact you if we need product-specific input from you. If you don’t respond within 48 hours, Stripe might issue a refund without your approval. You can still respond directly to customers, issue [refunds](https://docs.stripe.com/refunds.md), update subscriptions, and handle product-related issues yourself.

> Make sure your support email address is accurate and up-to-date in your [Dashboard settings](https://dashboard.stripe.com/settings/business-details). Stripe uses this email address for all customer support escalations.

### Refund support

Your customers can contact [Link support](https://support.link.com/topics/sold-through-link) to request refunds. Stripe can issue refunds within 60 days of the original transaction in certain cases.

When you or Stripe refund a transaction, the refund includes any sales tax the customer paid. Although the customer is refunded the full amount, Stripe is required to retain and remit the original sales tax amount on refunded transactions in certain jurisdictions. As a result, in these jurisdictions, your account balance will be reduced by the amount that corresponds to the original sales tax amount.

### Dispute support 

With Managed Payments, Stripe handles disputes for you. We use both automated tools and manual reviews to evaluate each dispute. If we decide to counter a dispute, we submit evidence on your behalf and won’t contact you for additional evidence. If we determine that you’re unlikely to win a dispute, we might accept it instead of countering it.

Received disputes incur a [dispute received fee](https://stripe.com/pricing). To help reduce disputes, we can enable automated [dispute prevention tools](https://docs.stripe.com/disputes/prevention-preview.md), such as Dispute Resolution, on your account for Managed Payments transactions. We charge your account for dispute prevention tools.

When Stripe submits evidence to counter a dispute, we cover the [evidence submission fee](https://support.stripe.com/questions/june-2025-pricing-updates-for-disputes#fee-details).

Go to the Stripe Dashboard to [view disputes](https://dashboard.stripe.com/disputes) on your Managed Payments transactions. You can also accept or counter disputes. An evidence submission fee applies if you counter a dispute yourself. If you add evidence to a dispute but don’t submit it, Stripe reviews the evidence and might submit it. If Stripe submits the evidence, we don’t charge you an evidence submission fee.

## Payment method availability 

Managed Payments supports the payment methods listed below. Some payment methods require local currency presentment before they appear at checkout.

Learn how to [configure payment method settings](https://support.stripe.com/questions/payment-method-configurations-for-managed-payments) for Managed Payments.

| Payment method                                                                                                                                                                                                                         | Supported buyer countries | Supports one-time payments | Supports recurring payments | Requires local currency presentment | Supports [Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md)1 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------- | --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Cards](https://docs.stripe.com/payments.md)                                                                                                                                                                                           | Global                    | ✓ Supported                | ✓ Supported                 | - Unsupported                       | ✓ Supported                                                                                                   |
| [Apple Pay](https://docs.stripe.com/apple-pay.md)                                                                                                                                                                                      | Global                    | ✓ Supported                | ✓ Supported                 | - Unsupported                       | ✓ Supported                                                                                                   |
| [Google Pay](https://docs.stripe.com/google-pay.md)                                                                                                                                                                                    | Global                    | ✓ Supported                | ✓ Supported                 | - Unsupported                       | ✓ Supported                                                                                                   |
| [Link](https://docs.stripe.com/payments/link.md)                                                                                                                                                                                       | Global                    | ✓ Supported                | ✓ Supported                 | - Unsupported                       | ✓ Supported                                                                                                   |
| [Klarna](https://docs.stripe.com/payments/klarna.md)                                                                                                                                                                                   | Global                    | ✓ Supported 2              | - Unsupported               | ✓ Supported                         | - Unsupported                                                                                                 |
| [Cash App Pay](https://docs.stripe.com/payments/cash-app-pay.md)                                                                                                                                                                       | US                        | ✓ Supported                | ✓ Supported                 | ✓ Supported                         | - Unsupported                                                                                                 |
| [Cash App Afterpay](https://docs.stripe.com/payments/afterpay-clearpay.md)                                                                                                                                                             | US                        | ✓ Supported                | - Unsupported               | ✓ Supported                         | - Unsupported                                                                                                 |
| [Korean cards](https://docs.stripe.com/payments/kr-card/accept-a-payment.md), [Kakao Pay](https://docs.stripe.com/payments/kakao-pay/accept-a-payment.md), [Naver Pay](https://docs.stripe.com/payments/naver-pay/accept-a-payment.md) | South Korea               | ✓ Supported                | ✓ Supported                 | ✓ Supported                         | ✓ Supported                                                                                                   |
| [Samsung Pay](https://docs.stripe.com/payments/samsung-pay/accept-a-payment.md), [PAYCO](https://docs.stripe.com/payments/payco/accept-a-payment.md)                                                                                   | South Korea               | ✓ Supported                | - Unsupported               | ✓ Supported                         | ✓ Supported                                                                                                   |
| [UPI](https://docs.stripe.com/payments/upi.md)                                                                                                                                                                                         | India                     | ✓ Supported                | ✓ Supported                 | ✓ Supported                         | - Unsupported                                                                                                 |
| [Pix](https://docs.stripe.com/payments/pix.md)                                                                                                                                                                                         | Brazil                    | ✓ Supported                | ✓ Supported 3               | ✓ Supported                         | - Unsupported                                                                                                 |
| [Bancontact](https://docs.stripe.com/payments/bancontact.md)                                                                                                                                                                           | Belgium                   | ✓ Supported                | ✓ Supported                 | ✓ Supported                         | ✓ Supported                                                                                                   |

1Adaptive Pricing is automatically available for Managed Payments and handles local currency conversion on your behalf. If Adaptive Pricing supports a payment method, you don’t need to handle local currency presentment for the payment method to display in your checkout.

2Klarna only supports one-time payments for Managed Payments. You can accept Klarna for recurring payments for checkout sessions that don’t use Managed Payments. Learn how to [set up future Klarna payments](https://docs.stripe.com/payments/klarna/set-up-future-payments.md).

3Pix doesn’t support daily subscriptions.

## Reports

You can view your Managed Payments transactions alongside your other transactions in the Dashboard, and filter them by transaction type. You can also access detailed records in the Dashboard or with the API.

## Handle data deletion requests

Customers can request deletion of their information for all Managed Payments transactions and the associated Link account.

If a customer requests deletion, Stripe:

- Cancels any subscriptions sold to them through Managed Payments.
- Deletes their data from any data objects (including objects in your Stripe account) that are used for, or generated from, Managed Payments transactions. This includes the [v2 Account](https://docs.stripe.com/api/v2/core/accounts.md), [Customer](https://docs.stripe.com/api/customers.md), [PaymentMethod](https://docs.stripe.com/api/payment_methods.md), [Invoice](https://docs.stripe.com/api/invoices.md), [PaymentIntent](https://docs.stripe.com/api/payment_intents.md), [Subscription](https://docs.stripe.com/api/subscriptions.md), and [Charge](https://docs.stripe.com/api/charges/object.md) objects.
- Sends you an email notification when the data deletion request is received.

## See also

- [Set up Managed Payments](https://docs.stripe.com/payments/managed-payments/set-up.md)
- [Update a Checkout integration](https://docs.stripe.com/payments/managed-payments/update-checkout.md)