import { Schema, Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

export type EncryptedSecretEnvelope = {
  version: number;
  keyId: string;
  algorithm: 'AES-256-GCM';
  nonce: string;
  ciphertext: string;
  tag: string;
  aad: string;
};

export const encryptedSecretEnvelopeSchema = new Schema<EncryptedSecretEnvelope>(
  {
    version: { type: Number, required: true, min: 1, max: 1000 },
    keyId: { type: String, required: true, trim: true, maxlength: 128 },
    algorithm: { type: String, required: true, enum: ['AES-256-GCM'] },
    nonce: { type: String, required: true, trim: true, maxlength: 256 },
    ciphertext: { type: String, required: true, maxlength: 1_000_000 },
    tag: { type: String, required: true, trim: true, maxlength: 256 },
    aad: { type: String, required: true, maxlength: 4096 },
  },
  { _id: false, id: false, strict: 'throw' },
);

export const objectId = () => ({ type: Schema.Types.ObjectId, required: true });

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}
