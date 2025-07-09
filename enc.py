from cryptography.fernet import Fernet
import os

class Encryption:
    def __init__(self, key):
        self.key = key

    def encrypt_data(self, data):
        if not isinstance(data, bytes):
            data = data.encode()
        return Fernet(self.key).encrypt(data)

    def decrypt_data(self, data):
        return Fernet(self.key).decrypt(data)

# Create folders if not exist
os.makedirs('encImages', exist_ok=True)
os.makedirs('decImages', exist_ok=True)

# Constants
enc_folder = './encImages/'
dec_folder = './decImages/'
key_path = 'key.pem'

def gen_key():
    key = Fernet.generate_key()
    with open(key_path, 'wb') as f:
        f.write(key)

def encrypt_images(folder_path, selected_files):
    gen_key()
    with open(key_path, 'rb') as f:
        key = f.read()

    enc = Encryption(key)
    for img_name in selected_files:
        img_path = os.path.join(folder_path, img_name)
        try:
            with open(img_path, 'rb') as f:
                data = f.read()
            enc_data = enc.encrypt_data(data)
            with open(os.path.join(enc_folder, img_name), 'wb') as f:
                f.write(enc_data)
            print(f"🔒 Encrypted: {img_name}")
        except Exception as e:
            print(f"❌ Error encrypting {img_name}: {e}")
    print('✅ Done encryption.')

def decrypt_images():
    if not os.path.exists(key_path):
        print("❌ Key file not found. Please encrypt first.")
        return

    with open(key_path, 'rb') as f:
        key = f.read()

    enc = Encryption(key)
    enc_images = os.listdir(enc_folder)

    if not enc_images:
        print("⚠️ No encrypted images found.")
        return

    for img in enc_images:
        try:
            with open(os.path.join(enc_folder, img), 'rb') as f:
                data = f.read()
            dec_data = enc.decrypt_data(data)
            with open(os.path.join(dec_folder, img), 'wb') as f:
                f.write(dec_data)
            print(f"🔓 Decrypted: {img}")
        except Exception as e:
            print(f"❌ Failed to decrypt {img}: {str(e)}")
    print('✅ Done decryption.')

# --- MAIN ---
choice = input('Do you want to encrypt (e) or decrypt (d)? [e/d]: ').lower()
if choice == 'e':
    folder_path = input("Enter the folder path containing images:\n> ").strip()
    if not os.path.isdir(folder_path):
        print("❌ Invalid folder path.")
    else:
        files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
        if not files:
            print("⚠️ No files found in the folder.")
        else:
            print("\n📂 Files in folder:")
            for i, f in enumerate(files):
                print(f"{i + 1}. {f}")
            file_input = input("\nEnter image file names to encrypt (comma-separated):\n> ").split(',')
            selected_files = [f.strip() for f in file_input if f.strip() in files]
            if not selected_files:
                print("❌ No valid file names selected.")
            else:
                encrypt_images(folder_path, selected_files)

elif choice == 'd':
    decrypt_images()
else:
    print("❌ Invalid choice.")
