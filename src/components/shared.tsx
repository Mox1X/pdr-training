import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { RULES_SOURCE } from "../data/signs";
import { getSign } from "../quiz";

export function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      style={back ? { transform: "rotate(180deg)" } : undefined}
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Mark({ correct }: { correct: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      {correct ? (
        <path
          d="m8 12 2.5 2.5L16 9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m9 9 6 6m0-6-6 6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
export function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="primary-button" onClick={onClick}>
      {children}
      <Arrow />
    </button>
  );
}
export type ImageStatus = "loading" | "loaded" | "error";
export function SignImage({
  id,
  reveal = false,
  className = "",
  image,
  alt,
  onStatus,
  attempt = 0,
}: {
  id: string;
  reveal?: boolean;
  className?: string;
  image?: string;
  alt?: string;
  onStatus?: (image: string, status: ImageStatus) => void;
  attempt?: number;
}) {
  const sign = getSign(id),
    src = image ?? sign.image;
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src, attempt, retry]);
  const url = attempt + retry ? `${src}?retry=${attempt + retry}` : src;
  if (failed)
    return (
      <div className="image-error">
        <p role="alert">Не вдалося завантажити зображення.</p>
        {!onStatus && (
          <button
            className="text-button"
            onClick={() => {
              setFailed(false);
              setRetry((n) => n + 1);
            }}
          >
            Повторити завантаження
          </button>
        )}
      </div>
    );
  return (
    <img
      key={url}
      className={`sign-image ${className}`}
      src={url}
      alt={
        alt ??
        (reveal
          ? `Знак ${sign.number}: ${sign.answerLabel}`
          : "Дорожній знак, назву якого потрібно визначити")
      }
      onLoad={() => onStatus?.(src, "loaded")}
      onError={() => {
        setFailed(true);
        onStatus?.(src, "error");
      }}
      draggable={false}
    />
  );
}
export function SourceLink({ href = RULES_SOURCE }: { href?: string }) {
  return (
    <a className="source-link" href={href} target="_blank" rel="noreferrer">
      Переглянути в ПДР <span aria-hidden="true">↗</span>
    </a>
  );
}

export function Explanation({ id }: { id: string }) {
  const sign = getSign(id);
  return (
    <>
      <p>{sign.explanation}</p>
      {!!sign.details?.length && (
        <details className="rule-details">
          <summary>Умови, зона дії та винятки для цієї групи знаків</summary>
          {sign.details.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </details>
      )}
      <SourceLink href={sign.source} />
    </>
  );
}
