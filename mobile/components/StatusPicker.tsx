import { memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import {
  STATUSES, SERVICE_STATUSES, COURIERS,
  RECEIVED_OPTIONS, DELAY_OPTIONS, DISPATCH_OPTIONS, READY_OPTIONS, PREORDER_OPTIONS,
  SERVICE_CONFIRMED_OPTIONS, SERVICE_ON_THE_WAY_OPTIONS, SERVICE_LATE_OPTIONS,
  SERVICE_ARRIVED_OPTIONS, SERVICE_COMPLETED_OPTIONS, SERVICE_RESCHEDULED_OPTIONS,
  SERVICE_PARTS_OPTIONS, SERVICE_FOLLOWUP_OPTIONS,
} from '@/lib/status-config';
import StatusNotePicker from '@/components/StatusNotePicker';
import type { BusinessProfile } from '@/lib/storage';

interface Props {
  status:               string | null;
  onStatusPress:        (id: string) => void;
  profile:              BusinessProfile | null;
  // Product note fields
  receivedNote:         string | null;
  setReceivedNote:      (v: string | null) => void;
  delayReason:          string | null;
  setDelayReason:       (v: string | null) => void;
  dispatchDate:         string | null;
  setDispatchDate:      (v: string | null) => void;
  readyNote:            string | null;
  setReadyNote:         (v: string | null) => void;
  preOrderNote:         string | null;
  setPreOrderNote:      (v: string | null) => void;
  // Service note field
  serviceNote:          string | null;
  setServiceNote:       (v: string | null) => void;
  // Appointment (service)
  appointmentTime:      string;
  setAppointmentTime:   (v: string) => void;
  // Courier (product)
  courier:              string | null;
  setCourier:           (v: string | null) => void;
  otherCourierName:     string;
  setOtherCourierName:  (v: string) => void;
  waybill:              string;
  setWaybill:           (v: string) => void;
}

function StatusPicker({
  status, onStatusPress, profile,
  receivedNote, setReceivedNote, delayReason, setDelayReason,
  dispatchDate, setDispatchDate, readyNote, setReadyNote,
  preOrderNote, setPreOrderNote, serviceNote, setServiceNote,
  appointmentTime, setAppointmentTime,
  courier, setCourier, otherCourierName, setOtherCourierName,
  waybill, setWaybill,
}: Props) {
  const isService = (profile?.businessType ?? 'product') === 'service';

  return (
    <>
      {/* Courier (product) / Appointment time (service) */}
      {!isService ? (
        <View style={s.card}>
          <Text style={s.sectionLabel}>COURIER</Text>
          <Text style={s.cardHint}>Select the courier you're using for this order</Text>
          <View style={s.pillRow}>
            {COURIERS.map(c => (
              <TouchableOpacity
                key={c.name}
                style={[s.courierPill, courier === c.name && s.courierPillActive]}
                onPress={() => setCourier(courier === c.name ? null : c.name)}
                activeOpacity={0.8}
              >
                <Text style={[s.courierPillText, courier === c.name && s.courierPillTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.courierPill, courier === 'other' && s.courierPillActive]}
              onPress={() => setCourier(courier === 'other' ? null : 'other')}
              activeOpacity={0.8}
            >
              <Text style={[s.courierPillText, courier === 'other' && s.courierPillTextActive]}>Other</Text>
            </TouchableOpacity>
          </View>
          {courier === 'other' && (
            <TextInput
              style={[s.input, { marginTop: 12 }]}
              value={otherCourierName}
              onChangeText={setOtherCourierName}
              placeholder="Type courier name…"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={[s.input, { marginTop: 12 }]}
            value={waybill}
            onChangeText={setWaybill}
            placeholder="Waybill / tracking number (optional)"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="characters"
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.sectionLabel}>APPOINTMENT</Text>
          <Text style={s.cardHint}>When is the appointment? (optional)</Text>
          <TextInput
            style={s.input}
            value={appointmentTime}
            onChangeText={setAppointmentTime}
            placeholder="e.g. Tomorrow at 10:00 AM"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="words"
          />
        </View>
      )}

      {/* Status buttons */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>STATUS</Text>
        {!isService ? (
          <>
            <View style={s.statusGrid}>
              {STATUSES.map(st => {
                const active = status === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[s.statusBtn, active && { borderColor: st.color, backgroundColor: st.color + '15' }]}
                    onPress={() => onStatusPress(st.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.statusEmoji}>{st.emoji}</Text>
                    <Text style={[s.statusLabel, active && { color: st.color, fontWeight: '700' }]}>{st.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[s.preOrderBtn, status === 'pre-order' && s.preOrderBtnActive]}
              onPress={() => onStatusPress('pre-order')}
              activeOpacity={0.8}
            >
              <Text style={s.preOrderEmoji}>🗓️</Text>
              <Text style={[s.preOrderLabel, status === 'pre-order' && { color: Colors.accent, fontWeight: '700' }]}>Pre-order</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.statusGrid}>
            {SERVICE_STATUSES.map(st => {
              const active = status === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[s.statusBtn, active && { borderColor: st.color, backgroundColor: st.color + '15' }]}
                  onPress={() => onStatusPress(st.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.statusEmoji}>{st.emoji}</Text>
                  <Text style={[s.statusLabel, active && { color: st.color, fontWeight: '700' }]}>{st.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Status note pickers — product */}
      {status === 'received' && (
        <StatusNotePicker heading="What type of order?" options={RECEIVED_OPTIONS}
          selected={receivedNote} onSelect={setReceivedNote} activeColor="#8B5CF6"
          statusKey="received" customPlaceholder="e.g. pre-order, group buy..." />
      )}
      {status === 'delay' && (
        <StatusNotePicker heading="What's the delay?" options={DELAY_OPTIONS}
          selected={delayReason} onSelect={setDelayReason} activeColor="#FBBF24"
          statusKey="delay" customPlaceholder="e.g. customs hold, supplier..." />
      )}
      {status === 'dispatched' && (
        <StatusNotePicker heading="When dispatched?" options={DISPATCH_OPTIONS}
          selected={dispatchDate} onSelect={setDispatchDate} activeColor="#3B82F6"
          statusKey="dispatched" customPlaceholder="e.g. Monday, 15 May..." />
      )}
      {status === 'ready' && (
        <StatusNotePicker heading="Pickup detail" options={READY_OPTIONS}
          selected={readyNote} onSelect={setReadyNote} activeColor="#22C55E"
          statusKey="ready" customPlaceholder="e.g. ask for Thabo at counter..." />
      )}
      {status === 'pre-order' && (
        <StatusNotePicker heading="Pre-order detail" options={PREORDER_OPTIONS}
          selected={preOrderNote} onSelect={setPreOrderNote} activeColor="#6366F1"
          statusKey="pre-order" customPlaceholder="e.g. available end of month..." />
      )}

      {/* Status note pickers — service */}
      {status === 'booking-confirmed' && (
        <StatusNotePicker heading="Booking detail" options={SERVICE_CONFIRMED_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#2BA784"
          statusKey="booking-confirmed" customPlaceholder="e.g. bring your ID..." />
      )}
      {status === 'on-the-way' && (
        <StatusNotePicker heading="How far away?" options={SERVICE_ON_THE_WAY_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#3B82F6"
          statusKey="on-the-way" customPlaceholder="e.g. 30 minutes away..." />
      )}
      {status === 'running-late' && (
        <StatusNotePicker heading="Reason for delay?" options={SERVICE_LATE_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#E8A435"
          statusKey="running-late" customPlaceholder="e.g. stuck in load shedding..." />
      )}
      {status === 'arrived' && (
        <StatusNotePicker heading="On-site detail" options={SERVICE_ARRIVED_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#16A34A"
          statusKey="arrived" customPlaceholder="e.g. parking at gate..." />
      )}
      {status === 'completed' && (
        <StatusNotePicker heading="Job outcome" options={SERVICE_COMPLETED_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#8B5CF6"
          statusKey="completed" customPlaceholder="e.g. invoice sent..." />
      )}
      {status === 'rescheduled' && (
        <StatusNotePicker heading="Reason for reschedule" options={SERVICE_RESCHEDULED_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#6B7280"
          statusKey="rescheduled" customPlaceholder="e.g. new date is Monday..." />
      )}
      {status === 'waiting-parts' && (
        <StatusNotePicker heading="What are you waiting for?" options={SERVICE_PARTS_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#D4A843"
          statusKey="waiting-parts" customPlaceholder="e.g. part arrives Thursday..." />
      )}
      {status === 'follow-up' && (
        <StatusNotePicker heading="Follow-up reason" options={SERVICE_FOLLOWUP_OPTIONS}
          selected={serviceNote} onSelect={setServiceNote} activeColor="#EC4899"
          statusKey="follow-up" customPlaceholder="e.g. checking on the repair..." />
      )}
    </>
  );
}

export default memo(StatusPicker);

const s = StyleSheet.create({
  card:         { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.0, marginBottom: 14, textTransform: 'uppercase' },
  cardHint:     { fontSize: 13, color: Colors.textLight, fontWeight: '400', lineHeight: 20, marginTop: -8, marginBottom: 14 },
  input:        { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 16, color: Colors.text, lineHeight: 22 },

  pillRow:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  courierPill:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  courierPillActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  courierPillText:       { fontSize: 14, fontWeight: '500', color: Colors.text },
  courierPillTextActive: { color: Colors.primary, fontWeight: '700' },

  statusGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statusBtn:         { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 16, backgroundColor: Colors.background },
  statusEmoji:       { fontSize: 20 },
  statusLabel:       { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: 0.1 },
  preOrderBtn:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 16, backgroundColor: Colors.background },
  preOrderBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '12' },
  preOrderEmoji:     { fontSize: 20 },
  preOrderLabel:     { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: 0.1 },
});
