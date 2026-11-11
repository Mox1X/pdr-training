import { useRef, useState } from "react";
import { emptyProgress, loadProgress, STORAGE_KEY } from "../progress";
import type { Progress } from "../progress";

export function useProgress() {
  const [loaded] = useState(loadProgress);
  const [progress, setProgress] = useState(loaded.progress);
  const progressRef = useRef(progress);
  const canSave = useRef(!loaded.warning);
  const [warning, setWarning] = useState(loaded.warning);
  const save = (next: Progress) => {
    progressRef.current = next;
    setProgress(next);
    if (!canSave.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      canSave.current = false;
      setWarning(
        "Збереження недоступне. Прогрес цієї сесії залишиться лише до оновлення сторінки.",
      );
    }
  };
  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      canSave.current = true;
      setWarning("");
    } catch {
      canSave.current = false;
      setWarning(
        "Не вдалося видалити збережені дані браузера. Поточний прогрес скинуто лише в пам’яті.",
      );
    }
    progressRef.current = emptyProgress();
    setProgress(progressRef.current);
  };
  return { progress, progressRef, warning, save, reset };
}
