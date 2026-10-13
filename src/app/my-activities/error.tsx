"use client";

import { CatalogError } from "@/modules/activities/ui/catalog-error";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <CatalogError reset={reset} />; }
