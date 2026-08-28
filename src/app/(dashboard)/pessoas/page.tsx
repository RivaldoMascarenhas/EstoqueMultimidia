"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PessoasRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    const target = qs ? `/biometria/pessoas?${qs}` : "/biometria/pessoas";
    router.replace(target);
  }, [router, searchParams]);

  return null;
}
