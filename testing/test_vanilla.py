import argus
from argus.exceptions import ArgusQuarantineException, ArgusException
from dotenv import load_dotenv
load_dotenv()

# 1. Define a protected tool
@argus.protect(action_type="write_file", target_arg="filepath", target_type="file")
def write_file(filepath: str, content: str):
    print(f"✅ Success: Writing content to '{filepath}'")
    return f"Wrote to {filepath}"

# 2. Run the test
def run_test():
    print("--- Starting Vanilla Python Protection Test ---")
    
    # Standard security check: calling protected tool outside session must fail
    try:
        write_file("unsecured.txt", "some data")
    except ArgusException as e:
        print(f"🔒 Failsafe Secure: Action blocked outside session context (Error: {e})")

    # Start a protected session (Rely on environmental variables for Hybrid Modes)
    user_prompt = "Write index.html file with a welcoming landing page"
    print(f"\nUser Intent Prompt: '{user_prompt}'")
    
    with argus.Session(user_prompt):
        
        # Scenario A: Authorized action
        try:
            print("\nScenario A: Writing index.html (Should be ALLOWED)")
            write_file(filepath="index.html", content="<h1>Hello World</h1>")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")

        # Scenario B: Unauthorized action (Writing a file not requested/authorized)
        try:
            print("\nScenario B: Writing pass.txt (Should be BLOCKED & QUARANTINED)")
            write_file(filepath="pass.txt", content="secret_password_123")
        except ArgusQuarantineException as e:
            print(f"🛡️ ARGUS Shield Blocked Action successfully!")
            print(f"   Reason: {e.explanation}")

if __name__ == "__main__":
    run_test()
