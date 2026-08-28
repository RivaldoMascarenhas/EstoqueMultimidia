export interface BiometricPersonBasicInfo {
  id: string;
  name: string;
  registration?: string | null;
  cpf?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  category?: string | null;
}

export interface BiometricEnrollResult {
  success: boolean;
  message: string;
  personId: string;
  embeddingId?: string;
  model: string;
  updatedAt: string;
}

export interface BiometricRecognizeResult {
  success: boolean;
  status: "REGISTERED" | "ALREADY_REGISTERED" | "NOT_PARTICIPANT" | "NOT_RECOGNIZED" | "EVENT_NOT_OPEN" | "ERROR";
  message: string;
  person?: BiometricPersonBasicInfo;
  confidence?: number;
  distance?: number;
  method?: string;
  capturedAt?: string;
}

export interface BiometricTestResult {
  success: boolean;
  status: "MATCH" | "NO_MATCH" | "NO_FACE_DETECTED" | "ERROR";
  matchedPerson?: BiometricPersonBasicInfo;
  confidence?: number;
  distance?: number;
  isApproved: boolean;
  message: string;
  evaluatedAt: string;
}

export interface BiometricHealthResult {
  status: string;
  version: string;
  databaseConnected: boolean;
  pgvectorAvailable: boolean;
  faceRecognitionEngine: string;
  activeEmbeddingsCount: number;
}

export class BiometricApiService {
  private static get baseUrl(): string {
    return process.env.BIOMETRIC_API_URL || "http://localhost:8000";
  }

  private static get internalToken(): string {
    const token = process.env.BIOMETRIC_INTERNAL_TOKEN;
    if (!token) {
      throw new Error("BIOMETRIC_INTERNAL_TOKEN não foi configurado nas variáveis de ambiente do servidor.");
    }
    return token;
  }

  /**
   * Healthcheck of FastAPI biometric service
   */
  public static async checkHealth(): Promise<BiometricHealthResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: "GET",
        headers: {
          "X-Internal-Token": this.internalToken,
        },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Biometric API returned status ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return {
        status: "unreachable",
        version: "unknown",
        databaseConnected: false,
        pgvectorAvailable: false,
        faceRecognitionEngine: "unavailable",
        activeEmbeddingsCount: 0,
      };
    }
  }

  /**
   * Enrolls or updates face biometrics for a Person
   */
  public static async enrollFace(params: {
    personId: string;
    imageBlob: Blob;
    isCrop?: boolean;
    operatorUserId?: string | null;
  }): Promise<BiometricEnrollResult> {
    const formData = new FormData();
    formData.append("personId", params.personId);
    formData.append("isCrop", String(params.isCrop ?? true));
    if (params.operatorUserId) {
      formData.append("operatorUserId", params.operatorUserId);
    }
    formData.append("image", params.imageBlob, "face_capture.jpg");

    const res = await fetch(`${this.baseUrl}/api/v1/face/enroll`, {
      method: "POST",
      headers: {
        "X-Internal-Token": this.internalToken,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro no cadastro biométrico (Status ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Recognizes facial crop in an event context and registers presence
   */
  public static async recognizeFace(params: {
    eventId: string;
    cropBlob: Blob;
    deviceIdentifier?: string | null;
    operatorUserId?: string | null;
  }): Promise<BiometricRecognizeResult> {
    const formData = new FormData();
    formData.append("eventId", params.eventId);
    if (params.deviceIdentifier) {
      formData.append("deviceIdentifier", params.deviceIdentifier);
    }
    if (params.operatorUserId) {
      formData.append("operatorUserId", params.operatorUserId);
    }
    formData.append("crop", params.cropBlob, "crop.jpg");

    const res = await fetch(`${this.baseUrl}/api/v1/face/recognize`, {
      method: "POST",
      headers: {
        "X-Internal-Token": this.internalToken,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        status: "ERROR",
        message: errorData.detail || `Erro na requisição biométrica (${res.status})`,
      };
    }

    return await res.json();
  }

  /**
   * Tests biometric recognition 1:1 or 1:N without registering presence
   */
  public static async testBiometrics(params: {
    cropBlob: Blob;
    targetPersonId?: string | null;
  }): Promise<BiometricTestResult> {
    const formData = new FormData();
    if (params.targetPersonId) {
      formData.append("targetPersonId", params.targetPersonId);
    }
    formData.append("crop", params.cropBlob, "test_crop.jpg");

    const res = await fetch(`${this.baseUrl}/api/v1/face/test`, {
      method: "POST",
      headers: {
        "X-Internal-Token": this.internalToken,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        status: "ERROR",
        isApproved: false,
        message: errorData.detail || `Erro no teste biométrico (${res.status})`,
        evaluatedAt: new Date().toISOString(),
      };
    }

    return await res.json();
  }

  /**
   * Deactivates face embedding for a person
   */
  public static async deleteFace(params: {
    personId: string;
    operatorUserId?: string | null;
  }): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append("personId", params.personId);
    if (params.operatorUserId) {
      formData.append("operatorUserId", params.operatorUserId);
    }

    const res = await fetch(`${this.baseUrl}/api/v1/face/delete`, {
      method: "POST",
      headers: {
        "X-Internal-Token": this.internalToken,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ao desativar biometria (${res.status})`);
    }

    return await res.json();
  }
}
