import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError: (message: string) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Menangkap error saat memuat model (mis. file rusak, gagal decode Draco/KTX2).
 * Tidak menampilkan apa pun di dalam canvas; pesan diteruskan ke store untuk ErrorToast.
 * Reset dengan mengganti `key` (mis. saat URL model berubah).
 */
export class ModelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    const message =
      error instanceof Error && error.message
        ? `Gagal memuat model: ${error.message}`
        : 'Gagal memuat model. Berkas mungkin rusak atau tidak didukung.';
    this.props.onError(message);
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
