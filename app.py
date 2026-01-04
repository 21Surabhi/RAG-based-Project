import streamlit as st
import requests

st.set_page_config(page_title="Personal Tutor Assistant", layout="centered")

st.title("Personal Tutor Assistant")
st.write("Ask any question.")

uploaded_file = st.file_uploader("Upload File")

if st.button("Upload"):
    if uploaded_file is None:
        st.warning("Please upload a file!")
    else:
        with st.spinner("Uploading..."):
            files = {"file": (uploaded_file.name, uploaded_file.getvalue())}
            resp = requests.post("http://localhost:3000/upload-file", files=files)

            if resp.headers.get("content-type", "").startswith("application/json"):
                data = resp.json()
                st.success(data.get("message", "File uploaded!"))
            else:
                st.error("Upload failed. Backend response:")
                st.code(resp.text)

query = st.text_area("Your Question:", height=150)

if st.button("Submit"):
    if not query.strip():
        st.warning("Please enter a question!")
    else:
        with st.spinner("Thinking..."):
            try:
                response = requests.post(
                    "http://localhost:3000/ask",
                    json={"query": query}
                )

                data = response.json()

                if "answer" in data:
                    st.success("### Answer:")
                    st.write(data["answer"])
                else:
                    st.error("Backend Error:")
                    st.code(data)

            except Exception as e:
                st.error(f"Something went wrong: {e}")
