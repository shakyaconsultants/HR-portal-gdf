"use client";

import Image from "next/image";
import { useState } from "react";
import { COMPANY } from "@/lib/company";

export function CompanyLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`pub-logo-fallback ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        {COMPANY.name}
      </div>
    );
  }

  return (
    <Image
      src={COMPANY.logoPath}
      alt={`${COMPANY.name} logo`}
      width={size}
      height={size}
      className={`pub-logo-img ${className}`}
      priority
      onError={() => setFailed(true)}
    />
  );
}
