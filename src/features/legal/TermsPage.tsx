import Footer from "#/features/home/components/Footer";
import Navbar from "#/features/home/components/Navbar";
import {
	lastUpdated,
	link,
	list,
	listItem,
	page,
	paragraph,
	section,
	sectionTitle,
	title,
} from "./legal.css";

const TermsPage = () => (
	<>
		<Navbar />
		<main class={page}>
			<h1 class={title}>Terms & Conditions</h1>
			<p class={lastUpdated}>Last updated: September 10, 2026</p>

			<div class={section}>
				<h2 class={sectionTitle}>1. Acceptance of Terms</h2>
				<p class={paragraph}>
					By accessing or using OpenCadre ("Service"), you agree to be bound by
					these Terms & Conditions ("Terms"). If you do not agree to these
					Terms, you must not use the Service.
				</p>
				<p class={paragraph}>
					Acceptance of these Terms governs your use of the Service. It does
					not, by itself, constitute consent to any data processing that
					requires a separate legal basis, such as the AI assistant feature
					described in Section 6 and in our{" "}
					<a href="/privacy" class={link}>
						Privacy Policy
					</a>
					. Where consent is the legal basis for a given processing activity, it
					is requested and given separately from your acceptance of these Terms.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>2. Description of Service</h2>
				<p class={paragraph}>
					OpenCadre is a collaborative workspace application that provides
					markdown editing, kanban boards, and table management features. The
					Service includes an optional AI assistant feature powered by
					third-party AI providers.
				</p>
				<p class={paragraph}>
					OpenCadre is currently operated as an individual, non-commercial
					project.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>3. Account Registration</h2>
				<p class={paragraph}>
					To use the Service, you must create an account. You agree to:
				</p>
				<ul class={list}>
					<li class={listItem}>
						Provide accurate, current, and complete information during
						registration.
					</li>
					<li class={listItem}>
						Maintain the security of your password and account credentials.
					</li>
					<li class={listItem}>
						Accept responsibility for all activities that occur under your
						account.
					</li>
					<li class={listItem}>
						Notify us immediately of any unauthorized use of your account.
					</li>
				</ul>
				<p class={paragraph}>
					You must be at least 15 years old to create an account without
					parental or guardian consent, in accordance with Art. 8 of the RGPD
					and applicable French law. If you are under 15, you may only use the
					Service with the consent of a parent or legal guardian.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>4. Acceptable Use</h2>
				<p class={paragraph}>You agree not to:</p>
				<ul class={list}>
					<li class={listItem}>
						Use the Service for any unlawful purpose or in violation of any
						applicable law or regulation.
					</li>
					<li class={listItem}>
						Upload or transmit malicious code, viruses, or other harmful
						content.
					</li>
					<li class={listItem}>
						Attempt to gain unauthorized access to other users' accounts or the
						Service's infrastructure.
					</li>
					<li class={listItem}>
						Interfere with or disrupt the Service or servers connected to the
						Service.
					</li>
					<li class={listItem}>
						Use the AI feature to generate content that is illegal, harmful,
						threatening, abusive, harassing, defamatory, or otherwise
						objectionable.
					</li>
					<li class={listItem}>
						Attempt to reverse-engineer, decompile, or disassemble any part of
						the Service, except as permitted by applicable law or by the
						Service's open source license, where one applies to the relevant
						component.
					</li>
				</ul>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>5. Your Content</h2>
				<p class={paragraph}>
					You retain all rights to the content you create, upload, or generate
					within the Service ("Your Content"). By using the Service, you grant
					us a limited license to host, store, and display Your Content solely
					for the purpose of providing the Service to you.
				</p>
				<p class={paragraph}>
					You are solely responsible for Your Content. We do not claim ownership
					over any content created by users.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>6. AI Features</h2>
				<p class={paragraph}>
					The Service includes an optional AI assistant feature. Using it
					requires a separate, explicit action on your part each time, distinct
					from your acceptance of these Terms, in accordance with the legal
					basis described in our Privacy Policy. When you use this feature, your
					prompts and relevant content are sent to third-party AI providers
					(OpenRouter/OpenAI) for processing. By choosing to use the AI feature,
					you acknowledge and agree that:
				</p>
				<ul class={list}>
					<li class={listItem}>
						Your content is transmitted to and processed by external AI
						services.
					</li>
					<li class={listItem}>
						AI-generated responses may not be accurate and should be
						independently verified.
					</li>
					<li class={listItem}>
						You should not submit sensitive, confidential, or personally
						identifying information to the AI feature.
					</li>
					<li class={listItem}>
						You may decline or stop using the AI feature at any time without
						affecting your access to the rest of the Service.
					</li>
				</ul>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>7. Intellectual Property</h2>
				<p class={paragraph}>
					OpenCadre is distributed as open source software. Where a specific
					open source license applies to the Service's source code, that license
					governs your rights to copy, modify, and distribute the code, and
					takes precedence over this section for the code it covers. Trademarks,
					the OpenCadre name, and any proprietary branding are not licensed
					under the open source license and remain owned by their respective
					holder.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>8. Limitation of Liability</h2>
				<p class={paragraph}>
					The Service is provided "as is" and "as available," on a best-effort
					basis, without warranties of any kind, whether express or implied,
					including but not limited to implied warranties of merchantability,
					fitness for a particular purpose, and non-infringement, to the extent
					permitted by applicable law.
				</p>
				<p class={paragraph}>
					To the maximum extent permitted by applicable law, our liability for
					indirect, incidental, or consequential damages arising from your use
					of the Service is limited. Nothing in these Terms excludes or limits
					liability for gross negligence, willful misconduct, death or personal
					injury, or any other liability that cannot lawfully be excluded or
					limited under French law, including Article R212-1 of the Code de la
					consommation where you qualify as a consumer or non-professional.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>9. Data Protection</h2>
				<p class={paragraph}>
					Our collection and use of personal data is governed by our{" "}
					<a href="/privacy" class={link}>
						Privacy Policy
					</a>
					. Processing that relies on your consent, such as the AI assistant
					feature, is only carried out once you have separately given that
					consent, as described in the Privacy Policy and Section 6 above.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>10. Termination</h2>
				<p class={paragraph}>
					You may terminate your account at any time through the account
					settings. Upon termination:
				</p>
				<ul class={list}>
					<li class={listItem}>
						Your right to access and use the Service ceases immediately.
					</li>
					<li class={listItem}>
						Your personal data will be deleted in accordance with our Privacy
						Policy.
					</li>
				</ul>
				<p class={paragraph}>
					We reserve the right to suspend or terminate your access to the
					Service, with notice where reasonably possible, for conduct that
					violates these Terms or is otherwise harmful to other users, us, or
					third parties.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>11. Governing Law and Jurisdiction</h2>
				<p class={paragraph}>
					These Terms are governed by French law. If you are a consumer resident
					in the European Union, mandatory consumer protection provisions of
					your country of residence may also apply and are not affected by this
					clause. Any dispute that cannot be resolved amicably will be submitted
					to the competent French courts, without prejudice to your right as a
					consumer to bring proceedings before the courts of your own place of
					residence.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>12. Modifications to Terms</h2>
				<p class={paragraph}>
					We may modify these Terms at any time. We will notify you of material
					changes by posting the updated Terms on this page and updating the
					"Last updated" date. Your continued use of the Service after such
					changes constitutes acceptance of the modified Terms.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>13. Contact</h2>
				<p class={paragraph}>
					For any questions about these Terms, please contact us at:{" "}
					<a href="mailto:re1sub@proton.me" class={link}>
						re1sub@proton.me
					</a>
				</p>
			</div>
		</main>
		<Footer />
	</>
);

export default TermsPage;
