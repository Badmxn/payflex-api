import CryptoJS from 'crypto-js'

const SECRET = process.env.ENCRYPTION_KEY || 'payflex-encryption-key-change-in-production'

export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET).toString()
}

export const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export const encryptObject = (obj: Record<string, any>, fields: string[]) => {
  const result = { ...obj }
  for (const field of fields) {
    if (result[field]) {
      result[field] = encrypt(result[field])
    }
  }
  return result
}

export const decryptObject = (obj: Record<string, any>, fields: string[]) => {
  const result = { ...obj }
  for (const field of fields) {
    if (result[field]) {
      try {
        result[field] = decrypt(result[field])
      } catch {
        // field may not be encrypted
      }
    }
  }
  return result
}