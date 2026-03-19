import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { syntaxHighlighting, defaultHighlightStyle, LanguageSupport } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json as jsonLang } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { sql } from "@codemirror/lang-sql";
import { php } from "@codemirror/lang-php";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "@/lib/theme";

function getLanguage(filename: string): LanguageSupport | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return javascript();
    case "ts":
    case "mts":
    case "cts":
      return javascript({ typescript: true });
    case "jsx":
      return javascript({ jsx: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "py":
    case "pyw":
      return python();
    case "json":
    case "jsonc":
      return jsonLang();
    case "html":
    case "htm":
      return html();
    case "css":
    case "scss":
    case "less":
      return css();
    case "md":
    case "mdx":
    case "markdown":
      return markdown();
    case "xml":
    case "svg":
    case "xsl":
      return xml();
    case "yaml":
    case "yml":
      return yaml();
    case "rs":
      return rust();
    case "c":
    case "h":
    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
    case "hxx":
      return cpp();
    case "java":
      return java();
    case "go":
      return go();
    case "sql":
      return sql();
    case "php":
      return php();
    default:
      return null;
  }
}

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
  },
  ".cm-gutters": {
    backgroundColor: "rgb(249 250 251)",
    borderRight: "1px solid rgb(229 231 235)",
    color: "rgb(156 163 175)",
  },
});

export function CodeViewer({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const lang = getLanguage(filename);
    const extensions = [
      basicSetup,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      EditorView.lineWrapping,
    ];

    if (theme === "dark") {
      extensions.push(oneDark);
    } else {
      extensions.push(
        lightTheme,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      );
    }

    if (lang) extensions.push(lang);

    const state = EditorState.create({ doc: content, extensions });

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [content, filename, theme]);

  return <div ref={containerRef} />;
}
