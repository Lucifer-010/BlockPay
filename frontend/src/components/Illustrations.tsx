import React from 'react';

/* Feature 1: Three friends sharing a bill at a table */
export const GroupsTableIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 360 220" fill="none" className={className} aria-hidden="true">
    <ellipse cx="180" cy="186" rx="135" ry="18" fill="#C8EBD6" opacity="0.55" />
    {/* Left friend */}
    <circle cx="95" cy="72" r="21" fill="#73736B" stroke="#15803D" strokeWidth="2" />
    <path d="M84 68C86 58 104 58 106 68" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M62 142C62 115 76 100 95 100C114 100 128 115 128 142" fill="#FFFFFF" stroke="#73736B" strokeWidth="2" />
    <rect x="85" y="100" width="20" height="16" rx="6" fill="#DDF3E4" />

    {/* Right friend */}
    <circle cx="265" cy="72" r="21" fill="#DDF3E4" stroke="#15803D" strokeWidth="2" />
    <path d="M254 66C258 54 274 54 276 66" fill="#15803D" />
    <path d="M232 142C232 115 246 100 265 100C284 100 298 115 298 142" fill="#15803D" stroke="#0B3B2A" strokeWidth="2" />
    <rect x="255" y="100" width="20" height="14" rx="5" fill="#FFFFFF" />

    {/* Center friend */}
    <circle cx="180" cy="54" r="23" fill="#DDF3E4" stroke="#15803D" strokeWidth="2.2" />
    <path d="M162 46C166 32 194 32 198 46" fill="#15803D" />
    <path d="M144 134C144 102 159 86 180 86C201 86 216 102 216 134" fill="#15803D" stroke="#0B3B2A" strokeWidth="2" />
    <path d="M168 88L180 102L192 88" fill="#FFFFFF" />

    {/* Table */}
    <ellipse cx="180" cy="146" rx="126" ry="22" fill="#E9E6DF" stroke="#C8C5BC" strokeWidth="2" />
    <rect x="172" y="166" width="16" height="22" rx="4" fill="#73736B" />

    {/* Three share slips on the table */}
    <g transform="translate(88, 128) rotate(-6)">
      <rect width="46" height="32" rx="6" fill="#FFFFFF" stroke="#C8C5BC" strokeWidth="1.5" />
      <line x1="10" y1="12" x2="36" y2="12" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="20" x2="28" y2="20" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" />
    </g>
    <g transform="translate(157, 124)">
      <rect width="46" height="34" rx="6" fill="#FFFFFF" stroke="#15803D" strokeWidth="1.8" />
      <line x1="10" y1="13" x2="36" y2="13" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="22" x2="30" y2="22" stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <g transform="translate(226, 128) rotate(6)">
      <rect width="46" height="32" rx="6" fill="#FFFFFF" stroke="#C8C5BC" strokeWidth="1.5" />
      <line x1="10" y1="12" x2="36" y2="12" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="20" x2="26" y2="20" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

/* Feature 2: Bill card with equal/custom split bars */
export const SplitBarsIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 360 220" fill="none" className={className} aria-hidden="true">
    <rect x="64" y="24" width="232" height="172" rx="18" fill="#FFFFFF" stroke="#DDF3E4" strokeWidth="2" />
    <rect x="86" y="46" width="112" height="14" rx="7" fill="#1C1917" />
    <rect x="234" y="44" width="42" height="18" rx="9" fill="#DCFCE7" />
    <circle cx="245" cy="53" r="3.5" fill="#15803D" />

    {/* Split rows */}
    {[
      { y: 84, avatar: '#DBEAFE', text: '#1E40AF', label: 'A', fill: '#15803D', w: 118, badge: '#DCFCE7' },
      { y: 120, avatar: '#166534', text: '#FFFFFF', label: 'S', fill: '#22C55E', w: 94, badge: '#DCFCE7' },
      { y: 156, avatar: '#FFE4E6', text: '#9F1239', label: 'M', fill: '#F59E0B', w: 72, badge: '#FEF3C7' },
    ].map((row, i) => (
      <g key={i}>
        <circle cx="98" cy={row.y + 10} r="12" fill={row.avatar} />
        <text
          x="98"
          y={row.y + 14}
          textAnchor="middle"
          fill={row.text}
          fontSize="11"
          fontWeight="600"
          fontFamily="Manrope, sans-serif"
        >
          {row.label}
        </text>
        <rect x="120" y={row.y + 4} width="118" height="12" rx="6" fill="#E7E5E4" />
        <rect x="120" y={row.y + 4} width={row.w} height="12" rx="6" fill={row.fill} />
        <rect x="248" y={row.y + 2} width="28" height="16" rx="8" fill={row.badge} />
      </g>
    ))}
  </svg>
);

/* Feature 3: Non-custodial wallet approval & transfer */
export const WalletTransferIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 360 220" fill="none" className={className} aria-hidden="true">
    {/* Phone card */}
    <rect x="86" y="22" width="116" height="176" rx="22" fill="#1C1917" />
    <rect x="94" y="30" width="100" height="160" rx="16" fill="#F7FDF9" />
    <rect x="126" y="36" width="36" height="6" rx="3" fill="#1C1917" />
    <rect x="104" y="56" width="80" height="44" rx="10" fill="#15803D" />
    <rect x="114" y="68" width="42" height="8" rx="4" fill="#86EFAC" />
    <rect x="114" y="82" width="56" height="8" rx="4" fill="#FFFFFF" />
    <rect x="104" y="114" width="80" height="24" rx="8" fill="#DCFCE7" />
    <path d="M137 126L142 131L152 121" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="104" y="150" width="80" height="26" rx="8" fill="#15803D" />

    {/* Floating USDC coin & transfer arc */}
    <path d="M206 94C228 74 252 74 268 92" stroke="#15803D" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
    <circle cx="268" cy="116" r="34" fill="#FFFFFF" stroke="#15803D" strokeWidth="2.5" />
    <circle cx="268" cy="116" r="24" fill="#DCFCE7" />
    <text
      x="268"
      y="124"
      textAnchor="middle"
      fill="#15803D"
      fontSize="24"
      fontWeight="700"
      fontFamily="Inter, sans-serif"
    >
      $
    </text>
  </svg>
);

/* Feature 4: Payment ledger & timestamp record */
export const LedgerRecordIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 360 220" fill="none" className={className} aria-hidden="true">
    <rect x="74" y="28" width="212" height="164" rx="18" fill="#FFFFFF" stroke="#DDF3E4" strokeWidth="2" />
    {[
      { y: 52, status: '#DCFCE7', check: '#15803D', w: 96 },
      { y: 98, status: '#DCFCE7', check: '#15803D', w: 118 },
      { y: 144, status: '#FEF3C7', check: '#B45309', w: 82 },
    ].map((row, idx) => (
      <g key={idx}>
        <circle cx="102" cy={row.y + 12} r="13" fill={row.status} />
        <path
          d={`M97 ${row.y + 12}L101 ${row.y + 16}L108 ${row.y + 8}`}
          stroke={row.check}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="126" y={row.y + 3} width={row.w} height="8" rx="4" fill="#1C1917" />
        <rect x="126" y={row.y + 16} width="64" height="6" rx="3" fill="#A8A29E" />
        <rect x="234" y={row.y + 6} width="32" height="10" rx="5" fill="#E7E5E4" />
      </g>
    ))}
  </svg>
);

/* Use Case Mini Illustrations */
export const HousematesIllustration: React.FC = () => (
  <svg viewBox="0 0 180 120" fill="none" className="w-full h-28" aria-hidden="true">
    <path d="M40 58L90 24L140 58V100H40V58Z" fill="#DDF3E4" stroke="#15803D" strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="76" y="64" width="28" height="36" rx="4" fill="#FFFFFF" stroke="#15803D" strokeWidth="2" />
    <circle cx="98" cy="82" r="2" fill="#15803D" />
    <rect x="52" y="62" width="16" height="16" rx="3" fill="#FFFFFF" stroke="#15803D" strokeWidth="1.8" />
    <rect x="112" y="62" width="16" height="16" rx="3" fill="#FFFFFF" stroke="#15803D" strokeWidth="1.8" />
  </svg>
);

export const TripsIllustration: React.FC = () => (
  <svg viewBox="0 0 180 120" fill="none" className="w-full h-28" aria-hidden="true">
    <rect x="52" y="34" width="76" height="62" rx="14" fill="#DDF3E4" stroke="#15803D" strokeWidth="2.5" />
    <path d="M74 34V24C74 20.6863 76.6863 18 80 18H100C103.314 18 106 20.6863 106 24V34" stroke="#15803D" strokeWidth="2.5" />
    <line x1="76" y1="36" x2="76" y2="94" stroke="#15803D" strokeWidth="2" />
    <line x1="104" y1="36" x2="104" y2="94" stroke="#15803D" strokeWidth="2" />
    <rect x="82" y="54" width="16" height="22" rx="4" fill="#FFFFFF" stroke="#15803D" strokeWidth="1.8" />
  </svg>
);

export const DinnersIllustration: React.FC = () => (
  <svg viewBox="0 0 180 120" fill="none" className="w-full h-28" aria-hidden="true">
    <circle cx="90" cy="64" r="34" fill="#FFFFFF" stroke="#15803D" strokeWidth="2.5" />
    <circle cx="90" cy="64" r="22" fill="#DDF3E4" stroke="#15803D" strokeWidth="1.8" />
    <line x1="42" y1="42" x2="42" y2="86" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M37 42V54C37 57 47 57 47 54V42" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    <line x1="138" y1="42" x2="138" y2="86" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M138 42C144 42 146 56 138 60" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const TeamsIllustration: React.FC = () => (
  <svg viewBox="0 0 180 120" fill="none" className="w-full h-28" aria-hidden="true">
    <rect x="44" y="34" width="92" height="58" rx="10" fill="#FFFFFF" stroke="#15803D" strokeWidth="2.5" />
    <rect x="52" y="42" width="76" height="42" rx="6" fill="#DDF3E4" />
    <path d="M34 92H146" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
    <circle cx="74" cy="63" r="8" fill="#15803D" />
    <circle cx="106" cy="63" r="8" fill="#FFFFFF" stroke="#15803D" strokeWidth="2" />
  </svg>
);

/* Invite & State Illustrations */
export const InviteFriendsIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 420 260" fill="none" className={className} aria-hidden="true">
    <ellipse cx="210" cy="145" rx="150" ry="85" fill="#3DBE72" opacity="0.2" />
    {/* Alex on left */}
    <g>
      <circle cx="122" cy="112" r="28" fill="#7A4A30" stroke="#0B3B2A" strokeWidth="2.5" />
      <path d="M98 106C104 82 142 82 148 106" fill="#1C1917" />
      <path d="M76 218C76 172 95 148 122 148C149 148 168 172 168 218" fill="#16803F" stroke="#0B3B2A" strokeWidth="2.5" />
      <path d="M108 150L122 172L136 150" fill="#FFFFFF" />
    </g>

    {/* Shared bill receipt card in center */}
    <g transform="translate(164, 62)">
      <rect width="92" height="118" rx="14" fill="#FFFFFF" stroke="#0B3B2A" strokeWidth="2.5" />
      <rect x="16" y="20" width="60" height="10" rx="5" fill="#15803D" />
      <rect x="16" y="40" width="44" height="7" rx="3.5" fill="#A8A29E" />
      <rect x="16" y="56" width="52" height="7" rx="3.5" fill="#A8A29E" />
      <line x1="16" y1="76" x2="76" y2="76" stroke="#E7E5E4" strokeWidth="2" />
      <rect x="16" y="88" width="60" height="16" rx="8" fill="#DCFCE7" />
      <circle cx="28" cy="96" r="4" fill="#15803D" />
    </g>

    {/* Sam on right */}
    <g>
      <circle cx="298" cy="116" r="26" fill="#DDF3E4" stroke="#0B3B2A" strokeWidth="2.5" />
      <path d="M276 108C280 86 316 86 320 108" fill="#15803D" />
      <path d="M254 218C254 176 272 152 298 152C324 152 342 176 342 218" fill="#FFFFFF" stroke="#0B3B2A" strokeWidth="2.5" />
      <rect x="284" y="152" width="28" height="20" rx="8" fill="#DCFCE7" />
    </g>
  </svg>
);

export const ExpiredClockIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
    <circle cx="60" cy="60" r="44" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2.5" />
    <circle cx="60" cy="60" r="32" fill="#FFFFFF" />
    <path d="M60 40V60L74 68" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InvalidDocIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
    <rect x="26" y="18" width="68" height="84" rx="14" fill="#FEE2E2" stroke="#DC2626" strokeWidth="2.5" />
    <line x1="42" y1="42" x2="78" y2="42" stroke="#FCA5A5" strokeWidth="4" strokeLinecap="round" />
    <line x1="42" y1="56" x2="66" y2="56" stroke="#FCA5A5" strokeWidth="4" strokeLinecap="round" />
    <circle cx="60" cy="78" r="14" fill="#DC2626" />
    <path d="M55 73L65 83M65 73L55 83" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const AlreadyMemberIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
    <circle cx="60" cy="60" r="44" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2.5" />
    <path d="M42 61L54 73L79 48" stroke="#15803D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SettledCelebrationIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 140 120" fill="none" className={className} aria-hidden="true">
    <circle cx="70" cy="60" r="42" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2.5" />
    <path d="M52 61L64 73L89 48" stroke="#15803D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="34" r="5" fill="#86EFAC" />
    <circle cx="118" cy="30" r="6" fill="#22C55E" />
    <circle cx="116" cy="92" r="4" fill="#FDE047" />
    <circle cx="28" cy="88" r="4" fill="#86EFAC" />
  </svg>
);

export const WelcomeReadyIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 140 110" fill="none" className={className} aria-hidden="true">
    <ellipse cx="70" cy="62" rx="48" ry="38" fill="#DCFCE7" opacity="0.85" />
    <circle cx="70" cy="56" r="30" fill="#15803D" />
    <path d="M57 56L66 65L84 47" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="26" cy="40" r="5" fill="#22C55E" />
    <circle cx="114" cy="34" r="6" fill="#86EFAC" />
    <circle cx="112" cy="80" r="4.5" fill="#15803D" />
  </svg>
);

export const WalletNeededIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 140 110" fill="none" className={className} aria-hidden="true">
    <ellipse cx="70" cy="58" rx="50" ry="38" fill="#DCFCE7" opacity="0.85" />
    <rect x="30" y="30" width="76" height="54" rx="12" fill="#FFFFFF" stroke="#15803D" strokeWidth="2.5" />
    <path d="M30 44H106" stroke="#DDF3E4" strokeWidth="4" />
    <rect x="76" y="48" width="34" height="22" rx="7" fill="#15803D" />
    <circle cx="88" cy="59" r="3.5" fill="#FFFFFF" />
    <rect x="42" y="54" width="24" height="6" rx="3" fill="#A8A29E" />
    <rect x="42" y="65" width="18" height="5" rx="2.5" fill="#D6D3D1" />
  </svg>
);

export const EmptyBillIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 140 110" fill="none" className={className} aria-hidden="true">
    <ellipse cx="70" cy="58" rx="48" ry="38" fill="#DCFCE7" opacity="0.8" />
    <rect x="42" y="18" width="56" height="74" rx="10" fill="#FFFFFF" stroke="#15803D" strokeWidth="2.4" />
    <rect x="52" y="32" width="36" height="7" rx="3.5" fill="#15803D" />
    <rect x="52" y="47" width="28" height="6" rx="3" fill="#A8A29E" />
    <rect x="52" y="59" width="34" height="6" rx="3" fill="#A8A29E" />
    <rect x="52" y="73" width="22" height="8" rx="4" fill="#DCFCE7" />
  </svg>
);

export const SettledPersonIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
    <circle cx="60" cy="60" r="46" fill="#14532D" stroke="#33C773" strokeWidth="2" />
    <circle cx="60" cy="46" r="14" fill="#DCFCE7" />
    <path d="M36 86C36 72 46 64 60 64C74 64 84 72 84 86" fill="#33C773" />
    <circle cx="88" cy="36" r="14" fill="#22C55E" stroke="#0B2A1A" strokeWidth="2.5" />
    <path d="M82 36L86 40L94 32" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NetworkErrorIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 140 120" fill="none" className={className} aria-hidden="true">
    <circle cx="70" cy="60" r="48" fill="#14532D" opacity="0.55" />
    <path
      d="M42 74H98C105.732 74 112 67.732 112 60C112 52.8 106.56 46.87 99.56 46.08C96.76 35.68 87.28 28 76 28C63.8 28 53.72 36.98 52.12 48.72C45.32 50.06 40 56.08 40 63.33C40 69.22 44.78 74 50.67 74"
      fill="#DCFCE7"
      stroke="#33C773"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="48" y1="90" x2="92" y2="34" stroke="#F87171" strokeWidth="4" strokeLinecap="round" />
    <circle cx="96" cy="86" r="14" fill="#FEE2E2" stroke="#DC2626" strokeWidth="2.2" />
    <path d="M96 80V87M96 92H96.01" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const ReceiptEmptyIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 140 110" fill="none" className={className} aria-hidden="true">
    <ellipse cx="70" cy="56" rx="48" ry="38" fill="#DCFCE7" opacity="0.85" />
    <path
      d="M44 22C44 19.7909 45.7909 18 48 18H92C94.2091 18 96 19.7909 96 22V89L88 83L79 89L70 83L61 89L52 83L44 89V22Z"
      fill="#FFFFFF"
      stroke="#15803D"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <line x1="56" y1="36" x2="84" y2="36" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
    <line x1="56" y1="49" x2="76" y2="49" stroke="#A8A29E" strokeWidth="3" strokeLinecap="round" />
    <line x1="56" y1="61" x2="80" y2="61" stroke="#A8A29E" strokeWidth="3" strokeLinecap="round" />
    <circle cx="88" cy="70" r="10" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
    <path d="M84 70L87 73L92 67" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertTriangleIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true">
    <circle cx="48" cy="48" r="40" fill="#FEE2E2" />
    <path
      d="M48 25L71 65H25L48 25Z"
      fill="#FFFFFF"
      stroke="#DC2626"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <line x1="48" y1="40" x2="48" y2="51" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
    <circle cx="48" cy="57.5" r="2" fill="#DC2626" />
  </svg>
);


