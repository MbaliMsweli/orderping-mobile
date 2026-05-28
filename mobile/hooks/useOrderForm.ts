import { useState, useEffect } from 'react';
import { saveDraft, saveLastCourier, type FormDraft } from '@/lib/storage';
import type { Tone } from '@/lib/status-config';

export function useOrderForm() {
  // Paste
  const [orderText, setOrderText]   = useState('');
  const [extracting, setExtracting] = useState(false);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber]   = useState('');
  const [email, setEmail]               = useState('');

  // Courier
  const [courier, setCourier]                   = useState<string | null>(null);
  const [otherCourierName, setOtherCourierName] = useState('');
  const [waybill, setWaybill]                   = useState('');

  // Status + sub-notes
  const [status, setStatus]             = useState<string | null>(null);
  const [receivedNote, setReceivedNote] = useState<string | null>(null);
  const [delayReason, setDelayReason]   = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState<string | null>(null);
  const [readyNote, setReadyNote]       = useState<string | null>(null);
  const [preOrderNote, setPreOrderNote] = useState<string | null>(null);
  const [serviceNote, setServiceNote]   = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState('');

  // Tone + message
  const [tone, setTone]             = useState<Tone>('friendly');
  const [message, setMessage]       = useState('');
  const [generating, setGenerating] = useState(false);

  // Auto-save draft (debounced 400ms) — cleared on "Clear & Start New"
  useEffect(() => {
    if (!customerName && !phoneNumber && !status && !message) return;
    const t = setTimeout(() => {
      saveDraft({
        customerName, phoneNumber, email, status,
        receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, serviceNote,
        appointmentTime, tone, courier, otherCourierName, waybill, message,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [customerName, phoneNumber, email, status, receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, serviceNote, appointmentTime, tone, courier, otherCourierName, waybill, message]);

  // Remember the last courier used across sessions
  useEffect(() => {
    if (courier && courier !== 'other') saveLastCourier(courier);
  }, [courier]);

  const clearStatusNotes = () => {
    setReceivedNote(null); setDelayReason(null);
    setDispatchDate(null); setReadyNote(null); setPreOrderNote(null);
    setServiceNote(null);
  };

  const resetForm = () => {
    setOrderText(''); setCustomerName(''); setPhoneNumber(''); setEmail('');
    setCourier(null); setOtherCourierName(''); setWaybill('');
    setAppointmentTime(''); setStatus(null); setMessage(''); setTone('friendly');
    clearStatusNotes();
  };

  const loadDraft = (draft: FormDraft) => {
    if (draft.customerName)     setCustomerName(draft.customerName);
    if (draft.phoneNumber)      setPhoneNumber(draft.phoneNumber);
    if (draft.email)            setEmail(draft.email);
    if (draft.status)           setStatus(draft.status);
    if (draft.receivedNote)     setReceivedNote(draft.receivedNote);
    if (draft.delayReason)      setDelayReason(draft.delayReason);
    if (draft.dispatchDate)     setDispatchDate(draft.dispatchDate);
    if (draft.readyNote)        setReadyNote(draft.readyNote);
    if (draft.preOrderNote)     setPreOrderNote(draft.preOrderNote);
    if (draft.serviceNote)      setServiceNote(draft.serviceNote);
    if (draft.appointmentTime)  setAppointmentTime(draft.appointmentTime);
    if (draft.tone)             setTone(draft.tone as Tone);
    if (draft.courier)          setCourier(draft.courier);
    if (draft.otherCourierName) setOtherCourierName(draft.otherCourierName);
    if (draft.waybill)          setWaybill(draft.waybill);
    if (draft.message)          setMessage(draft.message);
  };

  return {
    orderText, setOrderText,
    extracting, setExtracting,
    customerName, setCustomerName,
    phoneNumber, setPhoneNumber,
    email, setEmail,
    courier, setCourier,
    otherCourierName, setOtherCourierName,
    waybill, setWaybill,
    status, setStatus,
    receivedNote, setReceivedNote,
    delayReason, setDelayReason,
    dispatchDate, setDispatchDate,
    readyNote, setReadyNote,
    preOrderNote, setPreOrderNote,
    serviceNote, setServiceNote,
    appointmentTime, setAppointmentTime,
    tone, setTone,
    message, setMessage,
    generating, setGenerating,
    clearStatusNotes,
    resetForm,
    loadDraft,
  };
}
