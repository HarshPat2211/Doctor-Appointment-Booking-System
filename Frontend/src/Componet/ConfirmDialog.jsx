import { AlertCircle, X, Check } from "lucide-react";
import Modal from "../Components/common/Modal";
import Button from "../Components/common/Button";

export default function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  backdropClassName = "bg-blue-900/20 backdrop-blur-sm",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} backdropClassName={backdropClassName}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className={`p-4 border-b flex items-center gap-3 rounded-t-2xl ${isDangerous ? "bg-red-50" : "bg-blue-50"}`}>
          <AlertCircle size={24} className={isDangerous ? "text-red-500" : "text-blue-500"} />
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-gray-700 text-center">{message}</p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-3 justify-end">
          <Button onClick={onCancel} variant="secondary">
            <X size={18} className="inline mr-2" />
            {cancelText}
          </Button>
          <Button onClick={onConfirm} variant={isDangerous ? "danger" : "primary"} className="gap-2">
            <Check size={18} />
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
