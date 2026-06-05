type CommStatus = {
  status: string | null;
  sent?: boolean;
};

/** Client-side gate for workflow email buttons (mirrors server prerequisites). */
export function canSendWorkflowCommunication(
  type: string,
  communications: Record<string, CommStatus | undefined>
): { allowed: boolean; reason?: string } {
  if (type === "JOINING_INSTRUCTIONS") {
    const offer = communications.OFFER_LETTER;
    if (offer?.status !== "SENT") {
      return {
        allowed: false,
        reason:
          offer?.status === "FAILED"
            ? "Fix and deliver the offer letter before sending joining instructions."
            : "Deliver the offer letter successfully before sending joining instructions.",
      };
    }
  }
  return { allowed: true };
}
