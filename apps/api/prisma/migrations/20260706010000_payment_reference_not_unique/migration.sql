-- Allow reusing a payment reference: drop the unique constraint, keep a plain index
DROP INDEX "Payment_referenceNumber_key";
