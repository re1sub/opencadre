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

const PrivacyPage = () => (
	<>
		<Navbar />
		<main class={page}>
			<h1 class={title}>Privacy Policy</h1>
			<p class={lastUpdated}>Last updated: September 10, 2026</p>

			<div class={section}>
				<h2 class={sectionTitle}>1. Introduction</h2>
				<p class={paragraph}>
					OpenCadre ("we", "us", "our") is committed to protecting your personal
					data and respecting your privacy in accordance with the European
					Regulation on the Protection of Personal Data (RGPD/GDPR, Regulation
					EU 2016/679) and applicable French data protection laws.
				</p>
				<p class={paragraph}>
					This Privacy Policy explains how we collect, use, store, and share
					your personal data when you use our application and services
					("Service"). Please read it carefully.
				</p>
				<p class={paragraph}>
					OpenCadre is currently an individual, non-commercial student project.
					A separate{" "}
					<a href="/terms" class={link}>
						Terms & Conditions
					</a>{" "}
					page identifies the site's host in accordance with French law (LCEN).
					This Privacy Policy governs data protection specifically; the Legal
					Notice covers publisher and hosting identification.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>2. Data Controller</h2>
				<p class={paragraph}>
					The data controller responsible for processing your personal data is
					the individual operating OpenCadre. As a non-professional, individual
					project, full identity details are not published on this page but are
					held by our hosting provider and can be disclosed to competent
					authorities upon lawful request, in accordance with LCEN article
					6-III-1. You can reach the data controller directly at:
				</p>
				<p class={paragraph}>
					<strong>OpenCadre</strong>
					<br />
					<a href="mailto:re1sub@proton.me" class={link}>
						re1sub@proton.me
					</a>
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>3. Data We Collect</h2>
				<p class={paragraph}>
					We collect the following categories of personal data:
				</p>

				<h3 class={sectionTitle}>3.1 Account Data</h3>
				<ul class={list}>
					<li class={listItem}>Email address</li>
					<li class={listItem}>Display name</li>
					<li class={listItem}>Avatar image (if provided)</li>
					<li class={listItem}>Encrypted password</li>
				</ul>

				<h3 class={sectionTitle}>3.2 Content Data</h3>
				<ul class={list}>
					<li class={listItem}>Pages, documents, and notes you create</li>
					<li class={listItem}>Kanban board cards and columns</li>
					<li class={listItem}>Table data</li>
					<li class={listItem}>Comments and reactions</li>
					<li class={listItem}>Collaborative editing state</li>
				</ul>

				<h3 class={sectionTitle}>3.3 Usage Data</h3>
				<ul class={list}>
					<li class={listItem}>
						Page visit history (which pages you view and when)
					</li>
					<li class={listItem}>
						Activity logs (actions you perform in the application)
					</li>
					<li class={listItem}>Workspace membership information</li>
				</ul>

				<h3 class={sectionTitle}>3.4 AI Feature Data</h3>
				<ul class={list}>
					<li class={listItem}>
						Prompts and responses generated through the AI assistant feature
					</li>
					<li class={listItem}>
						Page or card content submitted for AI processing
					</li>
				</ul>

				<h3 class={sectionTitle}>3.5 Technical Data</h3>
				<ul class={list}>
					<li class={listItem}>
						Session tokens (stored locally in your browser)
					</li>
					<li class={listItem}>Theme and interface preferences</li>
				</ul>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>4. Purposes and Legal Basis for Processing</h2>
				<p class={paragraph}>
					We process your personal data for the following purposes and legal
					bases:
				</p>
				<ul class={list}>
					<li class={listItem}>
						<strong>Account management and authentication</strong> (Art. 6(1)(b)
						RGPD): Processing is necessary for the performance of the contract
						between you and us for the provision of the Service.
					</li>
					<li class={listItem}>
						<strong>Service provision and collaboration</strong> (Art. 6(1)(b)
						RGPD): Storing and displaying your content, enabling collaboration
						with workspace members.
					</li>
					<li class={listItem}>
						<strong>AI features</strong> (Art. 6(1)(a) RGPD): When you use the
						AI assistant, your content is processed by a third-party AI service.
						This requires your explicit action (initiating the AI request) and
						you may decline without losing access to core, non-AI features of
						the Service.
					</li>
					<li class={listItem}>
						<strong>Usage analytics</strong> (Art. 6(1)(f) RGPD): We track page
						visits and activity to power in-app features such as recent pages
						and to maintain and improve the Service. We consider this a
						proportionate, minimal-impact use of data limited to functionality
						you directly benefit from, rather than external tracking or
						profiling, which is why we rely on legitimate interest rather than
						consent for this specific processing.
					</li>
					<li class={listItem}>
						<strong>Legal obligations</strong> (Art. 6(1)(c) RGPD): Retaining
						certain data as required by applicable law.
					</li>
				</ul>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>5. Third-Party Data Sharing</h2>
				<p class={paragraph}>
					We share your data with the following third-party processors:
				</p>
				<ul class={list}>
					<li class={listItem}>
						<strong>Supabase</strong> (database hosting, authentication,
						real-time synchronization): Your account data, content, and usage
						data are stored on Supabase infrastructure, which may involve
						processing outside the European Economic Area (EEA). See{" "}
						<a
							href="https://supabase.com/privacy"
							class={link}
							target="_blank"
							rel="noopener noreferrer"
						>
							Supabase Privacy Policy
						</a>
						.
					</li>
					<li class={listItem}>
						<strong>OpenRouter / OpenAI</strong> (AI processing): When you use
						the AI assistant feature, your prompts and relevant page content are
						sent to OpenRouter, which routes them to OpenAI models. This data is
						processed to generate AI responses and may involve processing
						outside the EEA, including in the United States. See{" "}
						<a
							href="https://openrouter.ai/privacy"
							class={link}
							target="_blank"
							rel="noopener noreferrer"
						>
							OpenRouter Privacy Policy
						</a>
						.
					</li>
					<li class={listItem}>
						<strong>SMTP email provider</strong> (transactional emails): Email
						addresses are used to send workspace invitation emails.
					</li>
					<li class={listItem}>
						<strong>Cloudflare</strong> (hosting and content delivery): The
						application's frontend is served through Cloudflare's
						infrastructure. See the{" "}
						<a href="/terms" class={link}>
							Terms & Conditions
						</a>{" "}
						page for host identification details.
					</li>
				</ul>
				<p class={paragraph}>
					We do not sell your personal data to third parties. We do not use
					analytics or tracking services such as Google Analytics, Meta Pixel,
					or similar tools.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>6. Data Retention</h2>
				<p class={paragraph}>
					We retain your personal data for the following periods:
				</p>
				<ul class={list}>
					<li class={listItem}>
						<strong>Account data</strong>: Deleted immediately when you delete
						your account.
					</li>
					<li class={listItem}>
						<strong>Content data</strong>: Retained as long as your account is
						active. Deleted when you delete content or your account.
					</li>
					<li class={listItem}>
						<strong>Page visits</strong>: Automatically deleted after 90 days.
					</li>
					<li class={listItem}>
						<strong>Activity logs</strong>: Anonymized (user attribution
						removed) after 180 days.
					</li>
					<li class={listItem}>
						<strong>AI request history</strong>: Automatically deleted after 365
						days.
					</li>
				</ul>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>7. Your Rights Under RGPD</h2>
				<p class={paragraph}>
					In accordance with the RGPD, you have the following rights:
				</p>
				<ul class={list}>
					<li class={listItem}>
						<strong>Right of access</strong> (Art. 15): Obtain confirmation of
						whether we process your data and receive a copy of it.
					</li>
					<li class={listItem}>
						<strong>Right to rectification</strong> (Art. 16): Request
						correction of inaccurate personal data.
					</li>
					<li class={listItem}>
						<strong>Right to erasure</strong> (Art. 17): Request deletion of
						your personal data ("right to be forgotten").
					</li>
					<li class={listItem}>
						<strong>Right to data portability</strong> (Art. 20): Receive your
						personal data in a structured, commonly used, machine-readable
						format.
					</li>
					<li class={listItem}>
						<strong>Right to restriction of processing</strong> (Art. 18):
						Request restriction of processing in certain circumstances.
					</li>
					<li class={listItem}>
						<strong>Right to object</strong> (Art. 21): Object to processing
						based on legitimate interests, including the usage analytics
						described in Section 4.
					</li>
					<li class={listItem}>
						<strong>Right to withdraw consent</strong> (Art. 7(3)): Withdraw
						consent at any time without affecting the lawfulness of processing
						based on consent before its withdrawal.
					</li>
				</ul>
				<p class={paragraph}>
					To exercise these rights, you can use the settings in your account or
					contact us at{" "}
					<a href="mailto:re1sub@proton.me" class={link}>
						re1sub@proton.me
					</a>
					. You also have the right to lodge a complaint with the Commission
					Nationale de l'Informatique et des Libertes (CNIL) at{" "}
					<a
						href="https://www.cnil.fr"
						class={link}
						target="_blank"
						rel="noopener noreferrer"
					>
						www.cnil.fr
					</a>
					, or to seek a judicial remedy before the competent courts (Art. 79
					RGPD), independently of any complaint lodged with the CNIL.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>8. Data Security</h2>
				<p class={paragraph}>
					We implement appropriate technical and organizational measures to
					protect your personal data, including:
				</p>
				<ul class={list}>
					<li class={listItem}>TLS encryption for all data in transit</li>
					<li class={listItem}>Password hashing with bcrypt</li>
					<li class={listItem}>
						Row-level security policies restricting data access
					</li>
					<li class={listItem}>
						Session management with refresh token rotation
					</li>
				</ul>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>9. Cookies and Local Storage</h2>
				<p class={paragraph}>
					OpenCadre uses <strong>localStorage</strong> in your browser to store:
				</p>
				<ul class={list}>
					<li class={listItem}>Authentication session tokens</li>
					<li class={listItem}>Theme preference</li>
					<li class={listItem}>
						Interface layout preferences (e.g., sidebar width)
					</li>
				</ul>
				<p class={paragraph}>
					We do not use tracking cookies or third-party analytics cookies. No
					cookie consent banner is required under the ePrivacy Directive because
					the data stored is strictly necessary for authentication or reflects
					your own interface preferences, and is not used for tracking,
					profiling, or advertising purposes.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>10. International Data Transfers</h2>
				<p class={paragraph}>
					Your data may be processed on servers located outside the European
					Economic Area (EEA). Our AI processing provider, OpenRouter, may route
					requests to infrastructure located in the United States. Our hosting
					provider, Supabase, and our content delivery provider, Cloudflare, may
					also process data outside the EEA depending on infrastructure region.
					These transfers are subject to appropriate safeguards, including
					Standard Contractual Clauses (SCCs) where applicable, as provided by
					each processor.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>11. Minors</h2>
				<p class={paragraph}>
					The Service is not directed at children under 15 years of age. In
					accordance with Article 8 RGPD and French law, individuals under 15
					must obtain parental or guardian consent before creating an account.
					We do not knowingly collect personal data from children under 15
					without such consent. If you believe a child has provided us with
					personal data without appropriate consent, please contact us so we can
					delete it.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>12. Data Protection Officer</h2>
				<p class={paragraph}>
					As a small-scale, individually operated service, OpenCadre has not
					appointed a Data Protection Officer, as this is not required under
					Article 37 RGPD at our current scale. For any data protection question
					or request, please contact us directly using the details in Section 2
					or Section 13.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>13. Changes to This Policy</h2>
				<p class={paragraph}>
					We may update this Privacy Policy from time to time. We will notify
					you of any material changes by posting the new policy on this page and
					updating the "Last updated" date.
				</p>
			</div>

			<div class={section}>
				<h2 class={sectionTitle}>14. Contact</h2>
				<p class={paragraph}>
					For any questions about this Privacy Policy or to exercise your
					rights, please contact us at:{" "}
					<a href="mailto:re1sub@proton.me" class={link}>
						re1sub@proton.me
					</a>
				</p>
			</div>
		</main>
		<Footer />
	</>
);

export default PrivacyPage;
