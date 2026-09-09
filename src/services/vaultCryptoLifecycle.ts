import type { EncryptedEnvelope, KdfMetadata } from '../crypto';

export type VaultKeyState = 'locked' | 'unlocking' | 'unlocked';

export type VaultKeyOperations = {
  deriveKek(masterPassword: string, metadata: KdfMetadata): Promise<Uint8Array>;
  unwrapVek(envelope: EncryptedEnvelope, kek: Uint8Array, context: Record<string, unknown>): Promise<Uint8Array>;
  zeroize(value: Uint8Array): void;
};

export type VaultKeyMaterial = {
  wrappedVekEnvelope: EncryptedEnvelope;
  kdf: KdfMetadata;
  currentKeyId: string;
  encryptionFormatVersion: number;
  vaultId: string;
};

export function createTransientVaultKeyManager(operations: VaultKeyOperations) {
  let state: VaultKeyState = 'locked';
  let vek: Uint8Array | undefined;
  let kek: Uint8Array | undefined;

  function lock() {
    if (vek) operations.zeroize(vek);
    if (kek) operations.zeroize(kek);
    vek = undefined;
    kek = undefined;
    state = 'locked';
  }

  async function unlock(masterPassword: string, material: VaultKeyMaterial) {
    if (typeof masterPassword !== 'string' || masterPassword.length === 0) {
      throw new Error('VAULT_UNLOCK_FAILED');
    }
    lock();
    state = 'unlocking';
    let derivedKek: Uint8Array | undefined;
    try {
      derivedKek = await operations.deriveKek(masterPassword, material.kdf);
      const unwrapped = await operations.unwrapVek(material.wrappedVekEnvelope, derivedKek, {
        purpose: 'vek-wrap',
        vaultId: material.vaultId,
        field: 'vek',
        revision: 1,
        keyId: material.currentKeyId,
        cryptoVersion: material.encryptionFormatVersion,
      });
      if (!(unwrapped instanceof Uint8Array) || unwrapped.byteLength !== 32) throw new Error('VAULT_UNLOCK_FAILED');
      kek = derivedKek;
      vek = unwrapped;
      state = 'unlocked';
      derivedKek = undefined;
      return vek;
    } catch {
      if (derivedKek) operations.zeroize(derivedKek);
      lock();
      throw new Error('VAULT_UNLOCK_FAILED');
    }
  }

  function getState(): VaultKeyState {
    return state;
  }

  function getVek(): Uint8Array | undefined {
    return vek;
  }

  return { unlock, lock, getState, getVek };
}
