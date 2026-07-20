import { useEffect } from "react";

const SUFFIX = "Career Intel";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title === SUFFIX ? title : `${title} · ${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
