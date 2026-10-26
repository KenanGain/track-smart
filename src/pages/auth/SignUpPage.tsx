import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Copy, CreditCard, IdCard, Lock, ShieldCheck, Smartphone, Truck, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/data/users.data";
import { BUSINESS_TYPES, type BusinessType } from "@/pages/accounts/service-profiles.data";
import { TIER_CONFIG, type SubscriptionTier } from "@/pages/admin/billing.data";
import {
    FLEET_PLANS, SERVICE_TIERS, demoPayment, emailTaken, signUpCarrier, signUpDriver, signUpServiceProfile, signUpUser, validEmail,
    type CarrierInput, type DriverInput, type PersonInput, type Receipt, type ServiceInput, type SignupKind,
} from "@/data/signup";

// ─────────────────────────────────────────────────────────────────────────────
// Sign up — four kinds of account, three steps (four with a plan to pay for).
//
//   1. What are you?       driver · office user · a carrier (fleet account) · a service profile
//   2. Your details        the person, plus what the kind needs (licence, carrier, company)
//   3. Plan & payment      carriers and service profiles only — a demo checkout, nothing charged
//   4. Done                what was created, the user ID, the receipt, and the way in
// ─────────────────────────────────────────────────────────────────────────────

type Step = "kind" | "details" | "plan" | "done";
const FIELD = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors";
const LABEL = "block text-xs font-medium text-slate-700 mb-1";

const KINDS: { id: SignupKind; title: string; who: string; blurb: string; Icon: LucideIcon; tone: string; price?: string }[] = [
    { id: "driver", title: "Driver", who: "I drive.", blurb: "A driver account of your own. Sign in to the Driver app, keep your documents there, and apply to carriers that are hiring.", Icon: IdCard, tone: "bg-emerald-50 text-emerald-700 border-emerald-200", price: "Free" },
    { id: "user", title: "Office user", who: "I work for a fleet.", blurb: "An account with a user ID. Your Fleet Admin adds you to the carrier — or an Admin adds you to the service profile or one of its carriers.", Icon: User, tone: "bg-blue-50 text-blue-700 border-blue-200", price: "Free" },
    { id: "carrier", title: "Carrier profile", who: "I run a fleet.", blurb: "Your own carrier profile — a fleet account — with you as its Fleet Admin. Add drivers, units, documents and the team.", Icon: Truck, tone: "bg-violet-50 text-violet-700 border-violet-200", price: `from $${FLEET_PLANS[0].monthlyPrice}/mo` },
    { id: "service", title: "Service profile", who: "I manage carriers for others.", blurb: "A service profile with you as its Admin. Add carrier profiles under it, their teams, and watch them all from one dashboard.", Icon: Building2, tone: "bg-indigo-50 text-indigo-700 border-indigo-200", price: `from $${TIER_CONFIG.Starter.monthlyPrice}/mo` },
];
const DRIVER_TYPES = ["Long Haul Driver", "Local Driver", "Owner-Operator", "Driver Service/Lease"];
const US_STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
const CA_PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

export function SignUpPage({ onBack, onSignedUp }: { onBack: () => void; onSignedUp: (user: AppUser, kind: SignupKind) => void }) {
    const [step, setStep] = useState<Step>("kind");
    const [kind, setKind] = useState<SignupKind | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The person
    const [first, setFirst] = useState(""); const [last, setLast] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
    const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
    // What the kind needs
    const [title, setTitle] = useState("");
    const [driver, setDriver] = useState<DriverInput>({ driverType: DRIVER_TYPES[0], licenseNumber: "", licenseState: "", licenseExpiry: "", city: "", state: "", country: "USA" });
    const [carrier, setCarrier] = useState<CarrierInput>({ legalName: "", dbaName: "", dotNumber: "", cvorNumber: "", nscNumber: "", country: "US", city: "", state: "" });
    const [service, setService] = useState<ServiceInput>({ legalName: "", dbaName: "", businessType: "LLC", stateOfInc: "", street: "", city: "", state: "", zip: "", country: "United States" });
    // Plan & payment
    const [fleetPlan, setFleetPlan] = useState(FLEET_PLANS[1].id);
    const [tier, setTier] = useState<SubscriptionTier>("Pro");
    const [cardName, setCardName] = useState(""); const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242"); const [cardExp, setCardExp] = useState("12/28"); const [cardCvc, setCardCvc] = useState("123");
    const [paying, setPaying] = useState(false);
    // The outcome
    const [result, setResult] = useState<{ user: AppUser; created: string; receipt?: Receipt } | null>(null);
    const [copied, setCopied] = useState(false);

    const paid = kind === "carrier" || kind === "service";
    const steps: { id: Step; label: string }[] = [{ id: "kind", label: "Account type" }, { id: "details", label: "Your details" }, ...(paid ? [{ id: "plan" as Step, label: "Plan & payment" }] : []), { id: "done", label: "Done" }];
    const stepIndex = steps.findIndex((s) => s.id === step);
    const person = (): PersonInput => ({ firstName: first, lastName: last, email, phone, password });
    const region = (country: string) => (country === "Canada" || country === "CA" ? CA_PROVINCES : US_STATES);

    const validateDetails = (): string | null => {
        if (!first.trim() || !last.trim()) return "Enter your first and last name.";
        if (!validEmail(email)) return "Enter a valid email — it is how you will sign in.";
        if (emailTaken(email)) return "Somebody already signs in with this email. Sign in instead, or use another email.";
        if (password.length < 6) return "Choose a password of at least 6 characters.";
        if (password !== confirm) return "The two passwords do not match.";
        if (kind === "driver") {
            if (!driver.licenseNumber.trim()) return "Enter your licence number.";
            if (!driver.licenseState) return "Choose the state or province that issued your licence.";
            if (!driver.licenseExpiry) return "Enter when your licence expires.";
        }
        if (kind === "carrier") {
            if (!carrier.legalName.trim()) return "Enter the carrier's legal name.";
            if (carrier.country === "US" && !carrier.dotNumber?.trim()) return "Enter the USDOT number.";
            if (carrier.country === "CA" && !carrier.cvorNumber?.trim() && !carrier.nscNumber?.trim()) return "Enter the CVOR or NSC number.";
            if (!carrier.city.trim() || !carrier.state) return "Enter the carrier's city and state or province.";
        }
        if (kind === "service") {
            if (!service.legalName.trim()) return "Enter the company's legal name.";
            if (!service.stateOfInc) return "Choose where the company is incorporated.";
            if (!service.street.trim() || !service.city.trim() || !service.state || !service.zip.trim()) return "Enter the company's address.";
        }
        return null;
    };

    const finishFree = () => {
        const p = person();
        if (kind === "driver") { const u = signUpDriver(p, driver); setResult({ user: u, created: "Your driver account" }); }
        else { const u = signUpUser(p, title); setResult({ user: u, created: "Your account" }); }
        setStep("done");
    };
    const next = () => {
        setError(null);
        if (step === "kind") { if (!kind) return setError("Pick the kind of account you need."); setStep("details"); return; }
        if (step === "details") {
            const bad = validateDetails();
            if (bad) return setError(bad);
            if (paid) setStep("plan"); else finishFree();
        }
    };
    const pay = () => {
        setError(null);
        if (!cardName.trim()) return setError("Enter the name on the card.");
        if (cardNumber.replace(/\D/g, "").length < 12) return setError("Enter a card number — any digits will do in the demo.");
        setPaying(true);
        // A demo gateway: a beat, then a receipt.
        setTimeout(() => {
            const p = person();
            if (kind === "carrier") {
                const plan = FLEET_PLANS.find((x) => x.id === fleetPlan) ?? FLEET_PLANS[0];
                const receipt = demoPayment(`${plan.name} fleet plan · ${carrier.legalName}`, plan.monthlyPrice, cardNumber, plan.name);
                const { user, account } = signUpCarrier(p, carrier, plan, receipt);
                setResult({ user, created: `Carrier profile ${account.legalName}`, receipt });
            } else {
                const receipt = demoPayment(`${tier} plan · ${service.legalName}`, TIER_CONFIG[tier].monthlyPrice, cardNumber, tier);
                const { user, profile } = signUpServiceProfile(p, service, tier, receipt);
                setResult({ user, created: `Service profile ${profile.legalName}`, receipt });
            }
            setPaying(false);
            setStep("done");
        }, 900);
    };
    const copyId = () => { if (!result) return; try { void navigator.clipboard?.writeText(result.user.id); } catch { /* no clipboard */ } setCopied(true); setTimeout(() => setCopied(false), 1500); };
    const amount = kind === "carrier" ? (FLEET_PLANS.find((x) => x.id === fleetPlan)?.monthlyPrice ?? 0) : TIER_CONFIG[tier].monthlyPrice;

    return (
        <div className="min-h-screen w-full flex items-start justify-center bg-slate-50 p-4 sm:py-8">
            <div className="w-full max-w-2xl">
                <div className="flex flex-col items-center mb-6">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center mb-3"><Truck className="text-white" size={22} /></div>
                    <h1 className="text-xl font-semibold text-slate-900">TrackSmart</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Create your account</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Steps */}
                    <ol className="flex items-center gap-2 border-b border-slate-100 px-6 py-3 text-[11px] font-semibold" aria-label="Sign-up steps">
                        {steps.map((s, i) => (
                            <li key={s.id} className={cn("flex items-center gap-2", i < steps.length - 1 && "flex-1")}>
                                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", i < stepIndex ? "bg-emerald-500 text-white" : i === stepIndex ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500")}>{i < stepIndex ? <Check size={11} /> : i + 1}</span>
                                <span className={cn("hidden sm:inline", i === stepIndex ? "text-slate-900" : "text-slate-500")}>{s.label}</span>
                                {i < steps.length - 1 && <span className="ml-1 h-px flex-1 bg-slate-200" />}
                            </li>
                        ))}
                    </ol>

                    <div className="px-6 py-5">
                        {step === "kind" && (
                            <>
                                <h2 className="text-base font-semibold text-slate-900">What are you signing up as?</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Each kind of account gets its own seat in TrackSmart.</p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {KINDS.map((k) => (
                                        <button key={k.id} type="button" onClick={() => { setKind(k.id); setError(null); }}
                                            className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-colors", kind === k.id ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60")}>
                                            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", k.tone)}><k.Icon size={19} /></span>
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900">{k.title}</span>{k.price && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", k.price === "Free" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{k.price}</span>}</span>
                                                <span className="block text-[12px] font-semibold text-slate-700">{k.who}</span>
                                                <span className="mt-1 block text-[12px] leading-snug text-slate-500">{k.blurb}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {step === "details" && kind && (
                            <form onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-5">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">Your details</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{KINDS.find((k) => k.id === kind)?.title} · {KINDS.find((k) => k.id === kind)?.who}</p>
                                </div>
                                <Section title="You">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="First name"><input className={FIELD} value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></Field>
                                        <Field label="Last name"><input className={FIELD} value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" /></Field>
                                        <Field label="Email"><input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
                                        <Field label="Phone (optional)"><input className={FIELD} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-0100" autoComplete="tel" /></Field>
                                        <Field label="Password"><input className={FIELD} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
                                        <Field label="Confirm password"><input className={FIELD} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
                                    </div>
                                </Section>
                                {kind === "user" && (
                                    <Section title="Your job">
                                        <Field label="Title (optional)"><input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dispatcher, Safety Coordinator" /></Field>
                                        <p className="mt-2 text-[12px] text-slate-500">You will get a <strong>user ID</strong>. Give it to your Fleet Admin or Admin and they add you to the carrier or service profile from Users &amp; Roles ▸ Add user ▸ Already signed up.</p>
                                    </Section>
                                )}
                                {kind === "driver" && (
                                    <Section title="Your licence">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field label="Country"><select className={FIELD} value={driver.country} onChange={(e) => setDriver({ ...driver, country: e.target.value as DriverInput["country"], licenseState: "", state: "" })}><option value="USA">United States</option><option value="Canada">Canada</option></select></Field>
                                            <Field label="Driver type"><select className={FIELD} value={driver.driverType} onChange={(e) => setDriver({ ...driver, driverType: e.target.value })}>{DRIVER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                                            <Field label="Licence number"><input className={FIELD} value={driver.licenseNumber} onChange={(e) => setDriver({ ...driver, licenseNumber: e.target.value })} /></Field>
                                            <Field label="Issued by"><select className={FIELD} value={driver.licenseState} onChange={(e) => setDriver({ ...driver, licenseState: e.target.value })}><option value="">Select…</option>{region(driver.country).map((s) => <option key={s}>{s}</option>)}</select></Field>
                                            <Field label="Licence expiry"><input className={FIELD} type="date" value={driver.licenseExpiry} onChange={(e) => setDriver({ ...driver, licenseExpiry: e.target.value })} /></Field>
                                            <Field label="City (optional)"><input className={FIELD} value={driver.city} onChange={(e) => setDriver({ ...driver, city: e.target.value })} /></Field>
                                        </div>
                                        <p className="mt-2 text-[12px] text-slate-500">You start with no carrier. From the Driver app, <strong>Apply for a carrier</strong> sends your application to one that is hiring.</p>
                                    </Section>
                                )}
                                {kind === "carrier" && (
                                    <Section title="Your carrier">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field label="Legal name"><input className={FIELD} value={carrier.legalName} onChange={(e) => setCarrier({ ...carrier, legalName: e.target.value })} /></Field>
                                            <Field label="DBA (optional)"><input className={FIELD} value={carrier.dbaName} onChange={(e) => setCarrier({ ...carrier, dbaName: e.target.value })} /></Field>
                                            <Field label="Country"><select className={FIELD} value={carrier.country} onChange={(e) => setCarrier({ ...carrier, country: e.target.value as CarrierInput["country"], state: "" })}><option value="US">United States</option><option value="CA">Canada</option></select></Field>
                                            {carrier.country === "US"
                                                ? <Field label="USDOT number"><input className={FIELD} value={carrier.dotNumber} onChange={(e) => setCarrier({ ...carrier, dotNumber: e.target.value })} /></Field>
                                                : <><Field label="CVOR (Ontario)"><input className={FIELD} value={carrier.cvorNumber} onChange={(e) => setCarrier({ ...carrier, cvorNumber: e.target.value })} /></Field><Field label="NSC number"><input className={FIELD} value={carrier.nscNumber} onChange={(e) => setCarrier({ ...carrier, nscNumber: e.target.value })} /></Field></>}
                                            <Field label="City"><input className={FIELD} value={carrier.city} onChange={(e) => setCarrier({ ...carrier, city: e.target.value })} /></Field>
                                            <Field label={carrier.country === "US" ? "State" : "Province"}><select className={FIELD} value={carrier.state} onChange={(e) => setCarrier({ ...carrier, state: e.target.value })}><option value="">Select…</option>{region(carrier.country).map((s) => <option key={s}>{s}</option>)}</select></Field>
                                        </div>
                                        <p className="mt-2 text-[12px] text-slate-500">You become the carrier's <strong>Fleet Admin</strong>. The rest of the profile — authority, addresses, cargo — is filled in from Account afterwards.</p>
                                    </Section>
                                )}
                                {kind === "service" && (
                                    <Section title="Your company">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field label="Legal name"><input className={FIELD} value={service.legalName} onChange={(e) => setService({ ...service, legalName: e.target.value })} /></Field>
                                            <Field label="DBA (optional)"><input className={FIELD} value={service.dbaName} onChange={(e) => setService({ ...service, dbaName: e.target.value })} /></Field>
                                            <Field label="Business type"><select className={FIELD} value={service.businessType} onChange={(e) => setService({ ...service, businessType: e.target.value as BusinessType })}>{BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                                            <Field label="Country"><select className={FIELD} value={service.country} onChange={(e) => setService({ ...service, country: e.target.value, stateOfInc: "", state: "" })}><option>United States</option><option>Canada</option></select></Field>
                                            <Field label="Incorporated in"><select className={FIELD} value={service.stateOfInc} onChange={(e) => setService({ ...service, stateOfInc: e.target.value })}><option value="">Select…</option>{region(service.country).map((s) => <option key={s}>{s}</option>)}</select></Field>
                                            <Field label="Street address"><input className={FIELD} value={service.street} onChange={(e) => setService({ ...service, street: e.target.value })} /></Field>
                                            <Field label="City"><input className={FIELD} value={service.city} onChange={(e) => setService({ ...service, city: e.target.value })} /></Field>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label={service.country === "Canada" ? "Province" : "State"}><select className={FIELD} value={service.state} onChange={(e) => setService({ ...service, state: e.target.value })}><option value="">—</option>{region(service.country).map((s) => <option key={s}>{s}</option>)}</select></Field>
                                                <Field label={service.country === "Canada" ? "Postal code" : "ZIP"}><input className={FIELD} value={service.zip} onChange={(e) => setService({ ...service, zip: e.target.value })} /></Field>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[12px] text-slate-500">You become the profile's <strong>Admin</strong>: you add carrier profiles under it, their Fleet Admins and teams, and see every carrier from one dashboard.</p>
                                    </Section>
                                )}
                                {error && <ErrorLine text={error} />}
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <button type="button" onClick={() => { setStep("kind"); setError(null); }} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={14} /> Back</button>
                                    <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">{paid ? "Choose a plan" : "Create my account"} <ArrowRight size={15} /></button>
                                </div>
                            </form>
                        )}

                        {step === "plan" && kind && (
                            <form onSubmit={(e) => { e.preventDefault(); pay(); }} className="space-y-5">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">Plan &amp; payment</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{kind === "carrier" ? `A fleet plan for ${carrier.legalName || "your carrier"}` : `A subscription for ${service.legalName || "your service profile"}`} · billed monthly · cancel any time.</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {kind === "carrier"
                                        ? FLEET_PLANS.map((p) => <PlanCard key={p.id} on={fleetPlan === p.id} name={p.name} price={p.monthlyPrice} blurb={p.blurb} onClick={() => setFleetPlan(p.id)} />)
                                        : SERVICE_TIERS.map((t) => <PlanCard key={t} on={tier === t} name={t} price={TIER_CONFIG[t].monthlyPrice} blurb={TIER_CONFIG[t].blurb} onClick={() => setTier(t)} />)}
                                </div>
                                <div className="grid gap-5 sm:grid-cols-[1fr_15rem]">
                                    <Section title="Card">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="sm:col-span-2"><Field label="Name on card"><input className={FIELD} value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder={`${first} ${last}`.trim() || "Name on card"} autoComplete="cc-name" /></Field></div>
                                            <div className="sm:col-span-2"><Field label="Card number"><div className="relative"><CreditCard size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={cn(FIELD, "pl-9 font-mono")} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} inputMode="numeric" autoComplete="cc-number" /></div></Field></div>
                                            <Field label="Expiry"><input className={cn(FIELD, "font-mono")} value={cardExp} onChange={(e) => setCardExp(e.target.value)} placeholder="MM/YY" autoComplete="cc-exp" /></Field>
                                            <Field label="CVC"><input className={cn(FIELD, "font-mono")} value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" autoComplete="cc-csc" /></Field>
                                        </div>
                                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"><Lock size={11} /> Demo checkout — nothing is charged and no card details are kept.</p>
                                    </Section>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Order</p>
                                        <div className="mt-2 flex items-start justify-between gap-2"><span className="text-slate-700">{kind === "carrier" ? `${FLEET_PLANS.find((x) => x.id === fleetPlan)?.name} fleet plan` : `${tier} plan`}</span><span className="font-semibold tabular-nums text-slate-900">${amount}</span></div>
                                        <div className="mt-1 flex items-start justify-between gap-2 text-slate-500"><span>Tax</span><span className="tabular-nums">$0</span></div>
                                        <div className="mt-3 flex items-start justify-between gap-2 border-t border-slate-200 pt-3"><span className="font-semibold text-slate-900">Due today</span><span className="text-lg font-bold tabular-nums text-slate-900">${amount}</span></div>
                                        <p className="mt-1 text-[11px] text-slate-500">then ${amount}/month</p>
                                    </div>
                                </div>
                                {error && <ErrorLine text={error} />}
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <button type="button" onClick={() => { setStep("details"); setError(null); }} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={14} /> Back</button>
                                    <button type="submit" disabled={paying} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                        <Lock size={14} /> {paying ? "Processing…" : `Pay $${amount} and create ${kind === "carrier" ? "the carrier" : "the profile"}`}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "done" && result && kind && (
                            <div className="space-y-5">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} /></span>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">{result.created} is ready</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Welcome, {result.user.name}. {kind === "driver" ? "Your seat is the Driver app." : kind === "user" ? "You are not on a carrier yet — see below." : kind === "carrier" ? "You are its Fleet Admin." : "You are its Admin."}</p>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Your user ID</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800">{result.user.id}</code>
                                            <button type="button" onClick={copyId} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">{copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>
                                        </div>
                                        <p className="mt-2 text-[12px] text-slate-500">{kind === "user" ? "Give this to your Fleet Admin or Admin — they add you with Users & Roles ▸ Add user ▸ Already signed up." : "Sign in with your email and the password you chose."}</p>
                                    </div>
                                    {result.receipt ? (
                                        <div className="rounded-xl border border-slate-200 p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Receipt</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">${result.receipt.amount} · {result.receipt.plan}</p>
                                            <p className="text-[12px] text-slate-500">{result.receipt.description}</p>
                                            <p className="mt-1 text-[11px] text-slate-400">{result.receipt.id} · card ending {result.receipt.last4} · {result.receipt.date} · demo, not charged</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-slate-200 p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">What happens next</p>
                                            <ul className="mt-1 space-y-1 text-[12px] text-slate-600">
                                                {kind === "driver" ? <><li>· Open the Driver app and keep your documents there.</li><li>· Apply for a carrier that is hiring; being hired puts you on its roster.</li></> : <><li>· A Fleet Admin adds you to a carrier with a role.</li><li>· Or an Admin adds you to the service profile, or one of its carriers.</li></>}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-1">
                                    <button type="button" onClick={() => onSignedUp(result.user, kind)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                                        {kind === "driver" ? <><Smartphone size={15} /> Open the Driver app</> : <><ShieldCheck size={15} /> Go to TrackSmart</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === "kind" && (
                            <>
                                {error && <div className="mt-4"><ErrorLine text={error} /></div>}
                                <div className="mt-5 flex items-center justify-between gap-3">
                                    <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={14} /> Sign in instead</button>
                                    <button type="button" onClick={next} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">Continue <ArrowRight size={15} /></button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-5">Prototype build · accounts live in this browser · payment is a demo and charges nothing.</p>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return <section><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>{children}</section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
    return <div><label className={LABEL}>{label}</label>{children}</div>;
}
function ErrorLine({ text }: { text: string }) {
    return <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span className="mt-0.5">•</span> {text}</div>;
}
function PlanCard({ on, name, price, blurb, onClick }: { on: boolean; name: string; price: number; blurb: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={cn("rounded-xl border p-3 text-left transition-colors", on ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300")}>
            <span className="flex items-center justify-between"><span className="text-sm font-bold text-slate-900">{name}</span>{on && <Check size={14} className="text-blue-600" />}</span>
            <span className="mt-1 block text-lg font-bold tabular-nums text-slate-900">${price}<span className="text-xs font-semibold text-slate-500">/mo</span></span>
            <span className="mt-1 block text-[11px] leading-snug text-slate-500">{blurb}</span>
        </button>
    );
}
