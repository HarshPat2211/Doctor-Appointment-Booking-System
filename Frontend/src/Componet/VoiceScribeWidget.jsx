import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Loader2, Play, RefreshCw, AlertCircle, CheckCircle, Volume2, Trash2 } from "lucide-react";
import API from "../pages/util/api";



export default function VoiceScribeWidget({ onApplyPrescription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      stopRecordingSession();
    };
  }, []);

  const stopRecordingSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        void 0;
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const startRecordingSession = () => {
    // 1. Clean up any previous session completely to prevent old speech replay
    stopRecordingSession();
    setError(null);
    setSuccessMsg(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    try {
      // 2. Create a BRAND NEW SpeechRecognition instance for this recording session
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      // 3. Reset transcript state cleanly
      setTranscript("");

      recognition.onresult = (event) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + " ";
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please allow microphone in Chrome or Mac System Settings.");
        } else if (event.error !== "aborted") {
          setError(`Voice input interrupted (${event.error}). You can type your clinical notes.`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Could not start microphone. Please check browser permissions.");
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingSession();
    } else {
      startRecordingSession();
    }
  };

  const handleClearTranscript = () => {
    stopRecordingSession();
    setTranscript("");
    setError(null);
    setSuccessMsg(null);
  };

  const handleProcessWithAI = async (textToProcess) => {
    const text = (typeof textToProcess === "string" ? textToProcess : transcript).trim();
    if (!text || text.length < 5) {
      setError("Please speak or enter your clinical prescription notes first.");
      return;
    }

    // Stop mic if still recording
    stopRecordingSession();

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data } = await API.post("/prescription/voice-scribe", { transcript: text });
      if (data?.prescription) {
        if (onApplyPrescription) {
          onApplyPrescription(data.prescription);
        }
        setSuccessMsg("✨ Prescription fields auto-filled by AI from voice notes!");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process voice notes with AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0e7ff 100%)",
        borderRadius: "14px",
        border: "1.5px solid #c4b5fd",
        padding: "16px 18px",
        marginBottom: "16px",
        boxShadow: "0 4px 14px -2px rgba(124, 58, 237, 0.12)",
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)" }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#4c1d95", display: "flex", alignItems: "center", gap: "6px" }}>
              AI Voice Scribe
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b21a8" }}>
              Speak your diagnosis & medications — AI will auto-fill the prescription fields below.
            </p>
          </div>
        </div>

        {/* Record & Clear buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {transcript && (
            <button
              type="button"
              onClick={handleClearTranscript}
              title="Clear transcript"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "7px 10px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "11.5px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <Trash2 size={12} /> Clear
            </button>
          )}

          <button
            type="button"
            onClick={toggleRecording}
            disabled={isProcessing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: isRecording
                ? "linear-gradient(135deg, #dc2626, #ef4444)"
                : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              border: "none",
              color: "#fff",
              fontSize: "12.5px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: isRecording
                ? "0 0 16px rgba(239, 68, 68, 0.55)"
                : "0 2px 8px rgba(124, 58, 237, 0.3)",
              transition: "all 0.2s"
            }}
          >
            {isRecording ? (
              <>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fff", animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                <MicOff size={14} /> Stop Recording
              </>
            ) : (
              <>
                <Mic size={14} /> Start Voice Scribe
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live recording status */}
      {isRecording && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "10px", padding: "8px 12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#b91c1c" }}>
            Listening... Speak your diagnosis, medicine name, dosage, frequency, and duration.
          </span>
        </div>
      )}

      {/* Transcript Textarea */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <textarea
          rows={2}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Spoken notes appear here... e.g., 'Patient has mild throat infection. Prescribing Amoxicillin 500mg twice daily for 5 days after meals. Advised warm salt water gargle.'"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #c4b5fd",
            fontSize: "12.5px",
            color: "#1e1b4b",
            background: "#fff",
            boxSizing: "border-box",
            outline: "none",
            resize: "vertical",
            lineHeight: "1.4"
          }}
        />
      </div>

      {/* Bottom control bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          {error && (
            <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={13} /> {error}
            </span>
          )}
          {successMsg && (
            <span style={{ fontSize: "12px", color: "#059669", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle size={13} /> {successMsg}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleProcessWithAI()}
          disabled={isProcessing || isRecording || !transcript.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            borderRadius: "9px",
            background: isProcessing || !transcript.trim()
              ? "#a78bfa"
              : "linear-gradient(135deg, #7c3aed, #4f46e5)",
            border: "none",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "700",
            cursor: isProcessing || !transcript.trim() ? "not-allowed" : "pointer",
            boxShadow: isProcessing || !transcript.trim() ? "none" : "0 2px 8px rgba(124, 58, 237, 0.25)"
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Parsing with AI...
            </>
          ) : (
            <>
              <Sparkles size={13} />
              Auto-Fill Prescription Form
            </>
          )}
        </button>
      </div>
    </div>
  );
}
