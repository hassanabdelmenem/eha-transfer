import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NewReferralPage } from "./NewReferralPage";
import { VoiceTextarea } from "../components/ui/VoiceTextarea";
import { DRAFT_STORAGE_KEY, WizardDraft } from "../components/referrals/wizard/types";
import { Role, DOCTOR_ROLES, isDoctorRole } from "../types";
import * as toastModule from "../lib/toast";

let mockCurrentUser: {
  id: string;
  name: string;
  role: Role;
  facilityId: string;
  verified: boolean;
} | null = {
  id: "doc-101",
  name: "Dr. Empirical Reviewer",
  role: "clinician",
  facilityId: "fac-1",
  verified: true,
};

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

const mockAddReferral = vi.fn();
let mockIsOnline = true;
const mockFacilities = [
  {
    id: "fac-1",
    name: "Referring General Hospital",
    departments: ["Emergency", "ICU", "Cardiology", "Surgery"],
    capacity: {
      Ward: { total: 20, occupied: 5 },
      ICU: { total: 10, occupied: 2 },
      CCU: { total: 5, occupied: 1 },
      PICU: { total: 0, occupied: 0 },
    },
    type: "district_hospital" as const,
    location: "Ismailia",
  },
  {
    id: "fac-2",
    name: "Ismailia Tertiary Complex",
    departments: ["Emergency", "ICU", "CCU", "Cardiology", "Surgery"],
    capacity: {
      Ward: { total: 50, occupied: 10 },
      ICU: { total: 20, occupied: 5 },
      CCU: { total: 10, occupied: 2 },
      PICU: { total: 5, occupied: 1 },
    },
    type: "tertiary_care" as const,
    location: "Ismailia",
  },
];

vi.mock("../contexts/DataContext", () => ({
  useData: () => ({
    facilities: mockFacilities,
    addReferral: mockAddReferral,
    isOnline: mockIsOnline,
  }),
}));

let objectUrlId = 0;
globalThis.URL.createObjectURL = vi.fn(() => {
  return "blob:test-preview-" + (++objectUrlId);
});

describe("Empirical Challenge 2: Unified Referral Intake Wizard", () => {
  let toastSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsOnline = true;
    objectUrlId = 0;
    mockCurrentUser = {
      id: "doc-101",
      name: "Dr. Empirical Reviewer",
      role: "clinician",
      facilityId: "fac-1",
      verified: true,
    };
    toastSpy = vi.spyOn(toastModule, "showToast").mockImplementation(() => "toast-id");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Role Authorization & Access Guards", () => {
    it("renders null when user is unauthenticated (user === null)", () => {
      mockCurrentUser = null;
      const { container } = render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();
    });

    const verifiedDoctorRoles: Role[] = [
      "consultant",
      "specialist",
      "resident",
      "clinician",
      "head_of_department",
      "medical_director",
      "owner",
    ];

    verifiedDoctorRoles.forEach((role) => {
      it("grants full wizard access to doctor role: " + role, () => {
        mockCurrentUser = {
          id: "usr-" + role,
          name: "Dr. " + role,
          role,
          facilityId: "fac-1",
          verified: true,
        };

        render(
          <MemoryRouter>
            <NewReferralPage />
          </MemoryRouter>
        );

        expect(screen.queryByText(/Access Denied. Only doctors can create new referrals./i)).not.toBeInTheDocument();
        expect(screen.getByText(/New Referral Request/i)).toBeInTheDocument();
        expect(document.querySelector("#hospitalId")).toBeInTheDocument();
      });
    });

    const strictlyNonDoctorRoles: Role[] = [
      "nurse",
      "nursing_supervisor",
      "er_official",
      "er_room",
    ];

    strictlyNonDoctorRoles.forEach((role) => {
      it("strictly denies wizard access to non-doctor role: " + role, () => {
        mockCurrentUser = {
          id: "usr-" + role,
          name: "Staff " + role,
          role,
          facilityId: "fac-1",
          verified: true,
        };

        render(
          <MemoryRouter>
            <NewReferralPage />
          </MemoryRouter>
        );

        expect(screen.getByText(/Access Denied. Only doctors can create new referrals./i)).toBeInTheDocument();
        expect(document.querySelector("#hospitalId")).not.toBeInTheDocument();
      });
    });
  });

  describe("2. Draft Auto-Save, Session Restore & Discard Mechanics", () => {
    it("persists changes into localStorage in real time as fields are modified", async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const hospIdInput = document.querySelector("#hospitalId") as HTMLInputElement;
      fireEvent.change(hospIdInput, { target: { value: "ISM-77112" } });

      const nameInput = document.querySelector("#patientName") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Nour Mahmoud" } });

      const ageInput = document.querySelector("#patientAge") as HTMLInputElement;
      fireEvent.change(ageInput, { target: { value: "45" } });

      const cardiologyBtn = screen.getByRole("button", { name: "Cardiology" });
      fireEvent.click(cardiologyBtn);

      const hrInput = document.querySelector("#vitalHr") as HTMLInputElement;
      fireEvent.change(hrInput, { target: { value: "110" } });

      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      expect(rawDraft).toBeTruthy();
      const parsedDraft: WizardDraft = JSON.parse(rawDraft!);

      expect(parsedDraft.patientData?.hospitalId).toBe("ISM-77112");
      expect(parsedDraft.patientData?.name).toBe("Nour Mahmoud");
      expect(parsedDraft.patientData?.age).toBe(45);
      expect(parsedDraft.receivingDepartments).toContain("Cardiology");
      expect(parsedDraft.patientData?.vitalSigns?.hr).toBe(110);
      expect(parsedDraft.lastSaved).toBeTruthy();
    });

    it("restores draft on initial mount, displays DraftRestoreBanner, and populates form", () => {
      const existingDraft: WizardDraft = {
        step: 2,
        patientData: {
          hospitalId: "ISM-RESTORE-1",
          name: "Restored Patient A",
          age: 62,
          gender: "female",
          vitalSigns: {
            hr: 95,
            bp: "140/90",
            spo2: 96,
            temp: 37.5,
            rr: 18,
            gcs: 15,
            timestamp: new Date().toISOString(),
          },
          complaint: "Severe shortness of breath",
          presentation: "Acute pulmonary edema",
          diagnosis: "Congestive Heart Failure",
          investigations: "Chest X-Ray: bilateral infiltration",
          attachments: [],
        },
        receivingDepartments: ["Cardiology", "ICU"],
        requiredBedType: "CCU",
        priority: "urgent",
        transferType: "one_way",
        reasonForReferral: "Urgent cardiac care required",
        isAutoRouting: false,
        receivingFacilityId: "fac-2",
        sendCriticalAlert: false,
        requiresAccompanyingDoctor: true,
        lastSaved: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(existingDraft));

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Draft referral restored/i)).toBeInTheDocument();
      expect((document.querySelector("#hospitalId") as HTMLInputElement).value).toBe("ISM-RESTORE-1");
      expect((document.querySelector("#patientName") as HTMLInputElement).value).toBe("Restored Patient A");
      expect((document.querySelector("#patientAge") as HTMLInputElement).value).toBe("62");
      expect((document.querySelector("#patientGender") as HTMLSelectElement).value).toBe("female");
      expect((document.querySelector("#requiredBedType") as HTMLSelectElement).value).toBe("CCU");
      expect((document.querySelector("#priority") as HTMLSelectElement).value).toBe("urgent");
      expect((document.querySelector("#reasonForReferral") as HTMLTextAreaElement).value).toBe("Urgent cardiac care required");
      expect((document.querySelector("#vitalHr") as HTMLInputElement).value).toBe("95");
      expect((document.querySelector("#vitalBp") as HTMLInputElement).value).toBe("140/90");
    });

    it("discards draft properly: purges localStorage, resets all state, dismisses banner", () => {
      const existingDraft: WizardDraft = {
        step: 1,
        patientData: {
          hospitalId: "ISM-DISCARD-99",
          name: "Patient To Discard",
          age: 30,
          gender: "male",
          vitalSigns: {
            hr: 120,
            bp: "160/100",
            spo2: 90,
            temp: 39.0,
            rr: 24,
            gcs: 13,
            timestamp: new Date().toISOString(),
          },
          complaint: "High fever and altered mental status",
          presentation: "Septic shock symptoms",
          diagnosis: "Severe Sepsis",
          investigations: "Blood cultures drawn",
          attachments: [],
        },
        receivingDepartments: ["ICU"],
        requiredBedType: "ICU",
        priority: "emergency",
        transferType: "one_way",
        reasonForReferral: "Emergency ICU bed",
        isAutoRouting: true,
        receivingFacilityId: "",
        sendCriticalAlert: true,
        requiresAccompanyingDoctor: true,
        lastSaved: new Date().toISOString(),
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(existingDraft));

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Draft referral restored/i)).toBeInTheDocument();

      const discardBtn = screen.getByRole("button", { name: /Discard Draft/i });
      fireEvent.click(discardBtn);

      expect(screen.queryByText(/Draft referral restored/i)).not.toBeInTheDocument();
      expect((document.querySelector("#hospitalId") as HTMLInputElement).value).toBe("");
      expect((document.querySelector("#patientName") as HTMLInputElement).value).toBe("");
      expect((document.querySelector("#reasonForReferral") as HTMLTextAreaElement).value).toBe("");
      expect(toastSpy).toHaveBeenCalledWith("Draft discarded.", "info");
    });

    it("gracefully handles corrupted JSON in localStorage without throwing runtime exceptions", () => {
      localStorage.setItem(DRAFT_STORAGE_KEY, "{ invalid JSON : missing quotes");

      expect(() => {
        render(
          <MemoryRouter>
            <NewReferralPage />
          </MemoryRouter>
        );
      }).not.toThrow();

      expect(screen.getByText(/New Referral Request/i)).toBeInTheDocument();
      expect(screen.queryByText(/Draft referral restored/i)).not.toBeInTheDocument();
    });

    it("handles localStorage quota exceeded during auto-save without crashing", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      expect(() => {
        render(
          <MemoryRouter>
            <NewReferralPage />
          </MemoryRouter>
        );

        const nameInput = document.querySelector("#patientName") as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: "Testing Quota Error" } });
      }).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("3. Voice Recognition Fallback & Dictation Mechanics", () => {
    it("safely renders textarea without mic button when SpeechRecognition API is absent in browser", () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const handleValueChange = vi.fn();
      render(
        <VoiceTextarea
          id="complaint"
          value="Initial complaint text"
          onValueChange={handleValueChange}
          placeholder="Enter complaint"
        />
      );

      const textarea = screen.getByPlaceholderText("Enter complaint") as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe("Initial complaint text");
      expect(screen.queryByRole("button", { name: /Start voice dictation|Stop recording/i })).not.toBeInTheDocument();
    });

    it("renders mic button and handles voice recognition events when SpeechRecognition is supported", () => {
      let recogInstance: any = null;

      class MockSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = "";
        onstart: any = null;
        onresult: any = null;
        onerror: any = null;
        onend: any = null;

        constructor() {
          recogInstance = this;
        }

        start() {
          if (this.onstart) this.onstart();
        }

        stop() {
          if (this.onend) this.onend();
        }

        abort() {}
      }

      (window as any).webkitSpeechRecognition = MockSpeechRecognition;

      let currentValue = "Patient complains of";
      const handleValueChange = vi.fn((newVal) => {
        currentValue = newVal;
      });

      const { unmount } = render(
        <VoiceTextarea
          id="presentation"
          value={currentValue}
          onValueChange={handleValueChange}
          placeholder="Clinical presentation"
        />
      );

      const micBtn = screen.getByRole("button", { name: /Start voice dictation/i });
      expect(micBtn).toBeInTheDocument();
      expect(micBtn).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(micBtn);
      expect(micBtn).toHaveAttribute("aria-pressed", "true");

      act(() => {
        if (recogInstance.onresult) {
          recogInstance.onresult({
            resultIndex: 0,
            results: [
              [
                {
                  transcript: "severe retrosternal chest pain radiating to left arm",
                  isFinal: true,
                },
              ],
            ],
          });
        }
      });

      act(() => {
        if (recogInstance.onerror) {
          recogInstance.onerror({ error: "not-allowed" });
        }
      });

      expect(micBtn).toHaveAttribute("aria-pressed", "false");

      unmount();
      delete (window as any).webkitSpeechRecognition;
    });
  });

  describe("4. Image Preview Rendering & Attachment Edge Cases", () => {
    it("correctly displays image thumbnail with object URL for uploaded image files", async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = document.querySelector("input[type=\"file\"]") as HTMLInputElement;
      const ecgImage = new File(["mock image binary data"], "ecg_trace_lead_2.jpg", { type: "image/jpeg" });
      Object.defineProperty(ecgImage, "size", { value: 1.5 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [ecgImage] } });

      await waitFor(() => {
        const previewImg = screen.getByAltText("ecg_trace_lead_2.jpg") as HTMLImageElement;
        expect(previewImg).toBeInTheDocument();
        expect(previewImg.src).toContain("blob:test-preview-");
        expect(previewImg).toHaveClass("object-cover");
      });

      expect(screen.getByText(/Quick View/i)).toBeInTheDocument();
    });

    it("correctly renders document file icon and title for PDF attachments without broken img tags", async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = document.querySelector("input[type=\"file\"]") as HTMLInputElement;
      const pdfReport = new File(["mock pdf content"], "echocardiogram_report.pdf", { type: "application/pdf" });
      Object.defineProperty(pdfReport, "size", { value: 3.2 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [pdfReport] } });

      await waitFor(() => {
        expect(screen.getByText("echocardiogram_report.pdf")).toBeInTheDocument();
        expect(screen.queryByAltText("echocardiogram_report.pdf")).not.toBeInTheDocument();
      });
    });

    it("enforces 15MB file size limit and prevents oversized files from being added", () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = document.querySelector("input[type=\"file\"]") as HTMLInputElement;
      const oversizedFile = new File(["x"], "huge_mri_scan.pdf", { type: "application/pdf" });
      Object.defineProperty(oversizedFile, "size", { value: 20 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringMatching(/exceeds the 15MB size limit/i),
        "error"
      );
      expect(screen.queryByText("huge_mri_scan.pdf")).not.toBeInTheDocument();
    });

    it("supports deleting attachments from the list", async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = document.querySelector("input[type=\"file\"]") as HTMLInputElement;
      const testFile = new File(["data"], "lab_results.png", { type: "image/png" });
      Object.defineProperty(testFile, "size", { value: 500 * 1024 });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByAltText("lab_results.png")).toBeInTheDocument();
      });

      const removeBtn = screen.getByLabelText(/Remove attachment lab_results\.png/i);
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByAltText("lab_results.png")).not.toBeInTheDocument();
      });
    });
  });

  describe("5. Data Context Integration & Offline Fallback", () => {
    it("passes complete patient data and critical alert flags to DataContext.addReferral", async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole("button", { name: "Cardiology" }));

      fireEvent.change(document.querySelector("#hospitalId")!, { target: { value: "ISM-33019" } });
      fireEvent.change(document.querySelector("#patientName")!, { target: { value: "Mahmoud Al-Sayed" } });
      fireEvent.change(document.querySelector("#patientAge")!, { target: { value: "52" } });

      fireEvent.change(document.querySelector("#reasonForReferral")!, {
        target: { value: "Acute STEMI transfer for primary PCI" },
      });
      fireEvent.change(document.querySelector("#priority")!, { target: { value: "emergency" } });

      fireEvent.click(document.querySelector("#critical-alert")!);
      fireEvent.click(document.querySelector("#requires-accompanying-doctor")!);

      fireEvent.change(document.querySelector("#complaint")!, { target: { value: "Crushing chest pain" } });
      fireEvent.change(document.querySelector("#presentation")!, { target: { value: "Diaphoretic and hypotensive" } });
      fireEvent.change(document.querySelector("#diagnosis")!, { target: { value: "Acute Inferior STEMI" } });

      fireEvent.click(screen.getByRole("button", { name: /Submit Referral/i }));

      await waitFor(() => {
        expect(mockAddReferral).toHaveBeenCalledWith(
          expect.objectContaining({
            referringUserId: "doc-101",
            referringFacilityId: "fac-1",
            priority: "emergency",
            requiresAccompanyingDoctor: true,
            receivingDepartments: ["Cardiology"],
            reasonForReferral: "Acute STEMI transfer for primary PCI",
            patientData: expect.objectContaining({
              hospitalId: "ISM-33019",
              name: "Mahmoud Al-Sayed",
              age: 52,
              complaint: "Crushing chest pain",
              diagnosis: "Acute Inferior STEMI",
            }),
          }),
          true
        );
      });
    });

    it("renders offline queued confirmation screen when submitted while offline (isOnline = false)", async () => {
      mockIsOnline = false;

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole("button", { name: "Emergency" }));

      fireEvent.change(document.querySelector("#hospitalId")!, { target: { value: "ISM-OFFLINE-1" } });
      fireEvent.change(document.querySelector("#patientName")!, { target: { value: "Offline Patient" } });
      fireEvent.change(document.querySelector("#patientAge")!, { target: { value: "40" } });
      fireEvent.change(document.querySelector("#reasonForReferral")!, { target: { value: "Offline queue test" } });
      fireEvent.change(document.querySelector("#complaint")!, { target: { value: "Pain" } });
      fireEvent.change(document.querySelector("#presentation")!, { target: { value: "Stable" } });
      fireEvent.change(document.querySelector("#diagnosis")!, { target: { value: "Trauma" } });

      fireEvent.click(screen.getByRole("button", { name: /Submit Referral/i }));

      await waitFor(() => {
        expect(screen.getByText(/Queued for/i)).toBeInTheDocument();
        expect(screen.getByText(/Offline · will send automatically when the connection is back/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
      });
    });
  });
});
