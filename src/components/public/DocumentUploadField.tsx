"use client";

import { useId, useState } from "react";

export function DocumentUploadField({
  id,
  name,
  label,
  required,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  const hintId = useId();
  const [fileName, setFileName] = useState("");

  return (
    <div className="pub-upload-field">
      <label htmlFor={id} className="pub-upload-label">
        {label}
        {required ? <span className="pub-required">*</span> : null}
      </label>
      <div className={`pub-upload-zone ${fileName ? "has-file" : ""}`}>
        <input
          id={id}
          name={name}
          type="file"
          className="pub-upload-input"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required={required}
          aria-describedby={hintId}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        <div className="pub-upload-content">
          <span className="pub-upload-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="pub-upload-title">{fileName || "Choose file or drag here"}</span>
          <span className="pub-upload-sub" id={hintId}>
            PDF, JPG, PNG · max 10 MB
          </span>
        </div>
      </div>
    </div>
  );
}
