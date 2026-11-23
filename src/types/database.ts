export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			activity_logs: {
				Row: {
					action: string;
					created_at: string;
					entity_id: string | null;
					entity_type: string;
					id: string;
					metadata: Json | null;
					user_id: string | null;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					action: string;
					created_at?: string;
					entity_id?: string | null;
					entity_type: string;
					id?: string;
					metadata?: Json | null;
					user_id?: string | null;
					workspace_id: string;
				};
				Update: {
					action?: string;
					created_at?: string;
					entity_id?: string | null;
					entity_type?: string;
					id?: string;
					metadata?: Json | null;
					user_id?: string | null;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "activity_logs_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			ai_requests: {
				Row: {
					card_id: string | null;
					created_at: string;
					id: string;
					model: string;
					page_id: string | null;
					tokens_used: number | null;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					card_id?: string | null;
					created_at?: string;
					id?: string;
					model: string;
					page_id?: string | null;
					tokens_used?: number | null;
					user_id: string;
				};
				Update: {
					card_id?: string | null;
					created_at?: string;
					id?: string;
					model?: string;
					page_id?: string | null;
					tokens_used?: number | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "ai_requests_card_id_fkey";
						columns: ["card_id"];
						isOneToOne: false;
						referencedRelation: "cards";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "ai_requests_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: false;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
				];
			};
			card_tags: {
				Row: {
					card_id: string;
					created_at: string;
					id: string;
					tag_id: string;
				};
				ComputedFields: never;
				Insert: {
					card_id: string;
					created_at?: string;
					id?: string;
					tag_id: string;
				};
				Update: {
					card_id?: string;
					created_at?: string;
					id?: string;
					tag_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "card_tags_card_id_fkey";
						columns: ["card_id"];
						isOneToOne: false;
						referencedRelation: "cards";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "card_tags_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "tags";
						referencedColumns: ["id"];
					},
				];
			};
			cards: {
				Row: {
					assignee_ids: string[] | null;
					ciphertext: string;
					column_id: string;
					created_at: string;
					due_date: string | null;
					id: string;
					iv: string | null;
					key_id: string | null;
					page_id: string;
					position: number;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					assignee_ids?: string[] | null;
					ciphertext: string;
					column_id: string;
					created_at?: string;
					due_date?: string | null;
					id?: string;
					iv?: never;
					key_id?: never;
					page_id: string;
					position?: number;
					updated_at?: string;
				};
				Update: {
					assignee_ids?: string[] | null;
					ciphertext?: string;
					column_id?: string;
					created_at?: string;
					due_date?: string | null;
					id?: string;
					iv?: never;
					key_id?: never;
					page_id?: string;
					position?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "cards_column_id_fkey";
						columns: ["column_id"];
						isOneToOne: false;
						referencedRelation: "columns";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "cards_key_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "cards_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: false;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
				];
			};
			columns: {
				Row: {
					ciphertext: string;
					color: string | null;
					created_at: string;
					id: string;
					iv: string | null;
					key_id: string | null;
					page_id: string;
					position: number;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					ciphertext: string;
					color?: string | null;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					page_id: string;
					position?: number;
					updated_at?: string;
				};
				Update: {
					ciphertext?: string;
					color?: string | null;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					page_id?: string;
					position?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "columns_key_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "columns_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: false;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
				];
			};
			comment_reactions: {
				Row: {
					comment_id: string;
					created_at: string;
					id: string;
					reaction: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					comment_id: string;
					created_at?: string;
					id?: string;
					reaction: string;
					user_id: string;
				};
				Update: {
					comment_id?: string;
					created_at?: string;
					id?: string;
					reaction?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "comment_reactions_comment_id_fkey";
						columns: ["comment_id"];
						isOneToOne: false;
						referencedRelation: "comments";
						referencedColumns: ["id"];
					},
				];
			};
			comment_threads: {
				Row: {
					created_at: string;
					entity_id: string;
					entity_type: string;
					id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					entity_id: string;
					entity_type: string;
					id?: string;
				};
				Update: {
					created_at?: string;
					entity_id?: string;
					entity_type?: string;
					id?: string;
				};
				Relationships: [];
			};
			comments: {
				Row: {
					author_id: string;
					ciphertext: string;
					created_at: string;
					id: string;
					iv: string | null;
					key_id: string | null;
					thread_id: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					author_id: string;
					ciphertext: string;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					thread_id: string;
					updated_at?: string;
				};
				Update: {
					author_id?: string;
					ciphertext?: string;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					thread_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "comments_key_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "comments_thread_id_fkey";
						columns: ["thread_id"];
						isOneToOne: false;
						referencedRelation: "comment_threads";
						referencedColumns: ["id"];
					},
				];
			};
			content_keys: {
				Row: {
					created_at: string;
					id: string;
					retired_at: string | null;
					status: string;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					retired_at?: string | null;
					status: string;
					workspace_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					retired_at?: string | null;
					status?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "content_keys_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			crypto_nonces: {
				Row: {
					created_at: string;
					entity_id: string | null;
					entity_type: string | null;
					iv: string;
					key_id: string;
					key_scope: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					entity_id?: string | null;
					entity_type?: string | null;
					iv: string;
					key_id: string;
					key_scope: string;
				};
				Update: {
					created_at?: string;
					entity_id?: string | null;
					entity_type?: string | null;
					iv?: string;
					key_id?: string;
					key_scope?: string;
				};
				Relationships: [];
			};
			device_link_requests: {
				Row: {
					approved_by_device_id: string | null;
					consumed_at: string | null;
					consumed_wrapped_key: Json | null;
					created_at: string;
					device_label: string;
					expires_at: string;
					id: string;
					one_time_public_key: string | null;
					responded_at: string | null;
					status: string;
					target_device_id: string | null;
					user_id: string;
					wrapped_private_key: Json | null;
				};
				ComputedFields: never;
				Insert: {
					approved_by_device_id?: string | null;
					consumed_at?: string | null;
					consumed_wrapped_key?: Json | null;
					created_at?: string;
					device_label: string;
					expires_at: string;
					id?: string;
					one_time_public_key?: string | null;
					responded_at?: string | null;
					status: string;
					target_device_id?: string | null;
					user_id: string;
					wrapped_private_key?: Json | null;
				};
				Update: {
					approved_by_device_id?: string | null;
					consumed_at?: string | null;
					consumed_wrapped_key?: Json | null;
					created_at?: string;
					device_label?: string;
					expires_at?: string;
					id?: string;
					one_time_public_key?: string | null;
					responded_at?: string | null;
					status?: string;
					target_device_id?: string | null;
					user_id?: string;
					wrapped_private_key?: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: "device_link_requests_approved_by_device_id_fkey";
						columns: ["approved_by_device_id"];
						isOneToOne: false;
						referencedRelation: "user_devices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "device_link_requests_target_device_id_fkey";
						columns: ["target_device_id"];
						isOneToOne: false;
						referencedRelation: "user_devices";
						referencedColumns: ["id"];
					},
				];
			};
			key_rotations: {
				Row: {
					completed_at: string | null;
					created_at: string;
					error_code: string | null;
					from_key_id: string | null;
					id: string;
					last_record_key: string;
					processed_count: number;
					started_at: string | null;
					status: string;
					to_key_id: string | null;
					total_count: number;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					completed_at?: string | null;
					created_at?: string;
					error_code?: string | null;
					from_key_id?: string | null;
					id?: string;
					last_record_key?: string;
					processed_count?: number;
					started_at?: string | null;
					status: string;
					to_key_id?: string | null;
					total_count?: number;
					workspace_id: string;
				};
				Update: {
					completed_at?: string | null;
					created_at?: string;
					error_code?: string | null;
					from_key_id?: string | null;
					id?: string;
					last_record_key?: string;
					processed_count?: number;
					started_at?: string | null;
					status?: string;
					to_key_id?: string | null;
					total_count?: number;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "key_rotations_from_key_id_fkey";
						columns: ["from_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "key_rotations_to_key_id_fkey";
						columns: ["to_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "key_rotations_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			notifications: {
				Row: {
					actor_id: string | null;
					body_ciphertext: string | null;
					body_iv: string | null;
					body_key_id: string | null;
					created_at: string;
					data: NonNullable<Json>;
					entity_id: string;
					entity_type: string;
					id: string;
					page_id: string | null;
					read_at: string | null;
					title_ciphertext: string;
					title_iv: string | null;
					title_key_id: string | null;
					type: Database["public"]["Enums"]["notification_type"];
					user_id: string;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					actor_id?: string | null;
					body_ciphertext?: string | null;
					body_iv?: never;
					body_key_id?: never;
					created_at?: string;
					data?: NonNullable<Json>;
					entity_id: string;
					entity_type: string;
					id?: string;
					page_id?: string | null;
					read_at?: string | null;
					title_ciphertext: string;
					title_iv?: never;
					title_key_id?: never;
					type: Database["public"]["Enums"]["notification_type"];
					user_id: string;
					workspace_id: string;
				};
				Update: {
					actor_id?: string | null;
					body_ciphertext?: string | null;
					body_iv?: never;
					body_key_id?: never;
					created_at?: string;
					data?: NonNullable<Json>;
					entity_id?: string;
					entity_type?: string;
					id?: string;
					page_id?: string | null;
					read_at?: string | null;
					title_ciphertext?: string;
					title_iv?: never;
					title_key_id?: never;
					type?: Database["public"]["Enums"]["notification_type"];
					user_id?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "notifications_body_key_fkey";
						columns: ["body_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "notifications_title_key_fkey";
						columns: ["title_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
				];
			};
			page_content: {
				Row: {
					ciphertext: string;
					created_at: string;
					id: string;
					iv: string | null;
					key_id: string | null;
					page_id: string;
					updated_at: string;
					version: number;
				};
				ComputedFields: never;
				Insert: {
					ciphertext: string;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					page_id: string;
					updated_at?: string;
					version?: number;
				};
				Update: {
					ciphertext?: string;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					page_id?: string;
					updated_at?: string;
					version?: number;
				};
				Relationships: [
					{
						foreignKeyName: "page_content_key_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "page_content_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: true;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
				];
			};
			page_visits: {
				Row: {
					id: string;
					page_id: string;
					user_id: string;
					viewed_at: string;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					id?: string;
					page_id: string;
					user_id: string;
					viewed_at?: string;
					workspace_id: string;
				};
				Update: {
					id?: string;
					page_id?: string;
					user_id?: string;
					viewed_at?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "page_visits_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: false;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "page_visits_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			pages: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					icon: string | null;
					id: string;
					is_deleted: boolean;
					is_favorite: boolean;
					kind: string;
					owner_id: string | null;
					position: number | null;
					title_ciphertext: string;
					title_iv: string | null;
					title_key_id: string | null;
					updated_at: string;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					icon?: string | null;
					id?: string;
					is_deleted?: boolean;
					is_favorite?: boolean;
					kind: string;
					owner_id?: string | null;
					position?: number | null;
					title_ciphertext: string;
					title_iv?: never;
					title_key_id?: never;
					updated_at?: string;
					workspace_id: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					icon?: string | null;
					id?: string;
					is_deleted?: boolean;
					is_favorite?: boolean;
					kind?: string;
					owner_id?: string | null;
					position?: number | null;
					title_ciphertext?: string;
					title_iv?: never;
					title_key_id?: never;
					updated_at?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "pages_title_key_fkey";
						columns: ["title_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "pages_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					display_name_ciphertext: string | null;
					id: string;
					updated_at: string | null;
				};
				ComputedFields: never;
				Insert: {
					avatar_url?: string | null;
					display_name_ciphertext?: string | null;
					id: string;
					updated_at?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					display_name_ciphertext?: string | null;
					id?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			recovery_attempts: {
				Row: {
					failed_count: number;
					locked_until: string | null;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					failed_count?: number;
					locked_until?: string | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					failed_count?: number;
					locked_until?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			security_events: {
				Row: {
					created_at: string;
					id: string;
					metadata: NonNullable<Json>;
					type: string;
					user_id: string | null;
					workspace_id: string | null;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					metadata?: NonNullable<Json>;
					type: string;
					user_id?: string | null;
					workspace_id?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					metadata?: NonNullable<Json>;
					type?: string;
					user_id?: string | null;
					workspace_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "security_events_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			tags: {
				Row: {
					ciphertext: string;
					color: string;
					created_at: string;
					id: string;
					iv: string | null;
					key_id: string | null;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					ciphertext: string;
					color?: string;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					workspace_id: string;
				};
				Update: {
					ciphertext?: string;
					color?: string;
					created_at?: string;
					id?: string;
					iv?: never;
					key_id?: never;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "tags_key_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "tags_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			user_content_key_wraps: {
				Row: {
					created_at: string;
					key_id: string;
					user_id: string;
					wrapped_key: NonNullable<Json>;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					key_id: string;
					user_id: string;
					wrapped_key: NonNullable<Json>;
				};
				Update: {
					created_at?: string;
					key_id?: string;
					user_id?: string;
					wrapped_key?: NonNullable<Json>;
				};
				Relationships: [
					{
						foreignKeyName: "user_content_key_wraps_key_id_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "user_content_keys";
						referencedColumns: ["id"];
					},
				];
			};
			user_content_keys: {
				Row: {
					created_at: string;
					id: string;
					status: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					status: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					status?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			user_devices: {
				Row: {
					created_at: string;
					device_label: string;
					id: string;
					identity_key_version: number;
					last_used_at: string | null;
					revoked_at: string | null;
					status: string;
					user_id: string;
					wrapped_private_key: NonNullable<Json>;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					device_label?: string;
					id?: string;
					identity_key_version?: number;
					last_used_at?: string | null;
					revoked_at?: string | null;
					status?: string;
					user_id: string;
					wrapped_private_key: NonNullable<Json>;
				};
				Update: {
					created_at?: string;
					device_label?: string;
					id?: string;
					identity_key_version?: number;
					last_used_at?: string | null;
					revoked_at?: string | null;
					status?: string;
					user_id?: string;
					wrapped_private_key?: NonNullable<Json>;
				};
				Relationships: [];
			};
			user_keys: {
				Row: {
					created_at: string;
					key_version: number;
					public_key: string;
					recovery_wrapped_key: NonNullable<Json>;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					key_version?: number;
					public_key: string;
					recovery_wrapped_key: NonNullable<Json>;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					key_version?: number;
					public_key?: string;
					recovery_wrapped_key?: NonNullable<Json>;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			user_settings: {
				Row: {
					created_at: string;
					notifications: Json | null;
					shortcuts: NonNullable<Json>;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					notifications?: Json | null;
					shortcuts?: NonNullable<Json>;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					notifications?: Json | null;
					shortcuts?: NonNullable<Json>;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			workspace_keys: {
				Row: {
					created_at: string;
					id: string;
					key_id: string;
					user_id: string;
					workspace_id: string;
					wrapped_key: NonNullable<Json>;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					key_id: string;
					user_id: string;
					workspace_id: string;
					wrapped_key: NonNullable<Json>;
				};
				Update: {
					created_at?: string;
					id?: string;
					key_id?: string;
					user_id?: string;
					workspace_id?: string;
					wrapped_key?: NonNullable<Json>;
				};
				Relationships: [
					{
						foreignKeyName: "workspace_keys_key_id_fkey";
						columns: ["key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "workspace_keys_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			workspace_members: {
				Row: {
					created_at: string;
					email: string;
					id: string;
					invite_token: string | null;
					role: string;
					user_id: string | null;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					email?: string;
					id?: string;
					invite_token?: string | null;
					role: string;
					user_id?: string | null;
					workspace_id: string;
				};
				Update: {
					created_at?: string;
					email?: string;
					id?: string;
					invite_token?: string | null;
					role?: string;
					user_id?: string | null;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "workspace_members_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "workspace_members_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			workspaces: {
				Row: {
					created_at: string;
					default_page_kind: string;
					description_ciphertext: string | null;
					description_iv: string | null;
					description_key_id: string | null;
					id: string;
					name_ciphertext: string | null;
					name_iv: string | null;
					name_key_id: string | null;
					owner_id: string;
					rotation_requested_at: string | null;
					rotation_required: boolean;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					default_page_kind?: string;
					description_ciphertext?: string | null;
					description_iv?: never;
					description_key_id?: never;
					id?: string;
					name_ciphertext?: string | null;
					name_iv?: never;
					name_key_id?: never;
					owner_id: string;
					rotation_requested_at?: string | null;
					rotation_required?: boolean;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					default_page_kind?: string;
					description_ciphertext?: string | null;
					description_iv?: never;
					description_key_id?: never;
					id?: string;
					name_ciphertext?: string | null;
					name_iv?: never;
					name_key_id?: never;
					owner_id?: string;
					rotation_requested_at?: string | null;
					rotation_required?: boolean;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "workspaces_description_key_fkey";
						columns: ["description_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "workspaces_name_key_fkey";
						columns: ["name_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
				];
			};
			ydocs: {
				Row: {
					entity_id: string;
					entity_type: string;
					id: string;
					state: string;
					state_iv: string | null;
					state_key_id: string | null;
					updated_at: string;
					version: number;
					workspace_id: string;
				};
				ComputedFields: never;
				Insert: {
					entity_id: string;
					entity_type: string;
					id?: string;
					state: string;
					state_iv?: never;
					state_key_id?: never;
					updated_at?: string;
					version?: number;
					workspace_id: string;
				};
				Update: {
					entity_id?: string;
					entity_type?: string;
					id?: string;
					state?: string;
					state_iv?: never;
					state_key_id?: never;
					updated_at?: string;
					version?: number;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "y_doc_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "ydocs_state_key_fkey";
						columns: ["state_key_id"];
						isOneToOne: false;
						referencedRelation: "content_keys";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			accept_invite: { Args: { token: string }; Returns: string };
			ack_rotation_batch: {
				Args: {
					p_last_record_key: string;
					p_processed_count: number;
					p_rotation_id: string;
				};
				Returns: undefined;
			};
			approve_device_link: {
				Args: {
					p_approving_device_id: string;
					p_request_id: string;
					p_wrapped_private_key: Json;
				};
				Returns: undefined;
			};
			assert_sealed_in_scope: {
				Args: {
					p_field: string;
					p_max_ct: number;
					p_owner: string;
					p_scope: string;
					p_value: string;
				};
				Returns: undefined;
			};
			begin_workspace_key_rotation: {
				Args: {
					p_new_key_id: string;
					p_old_key_id: string;
					p_workspace_id: string;
					p_wrapped_keys: Json;
				};
				Returns: string;
			};
			check_recovery_lock: {
				Args: Record<PropertyKey, never>;
				Returns: string;
			};
			comment_workspace_id: { Args: { p_thread_id: string }; Returns: string };
			complete_rotation: {
				Args: { p_rotation_id: string };
				Returns: undefined;
			};
			consume_device_link: {
				Args: {
					p_device_id: string;
					p_device_label: string;
					p_request_id: string;
					p_wrapped_private_key: Json;
				};
				Returns: undefined;
			};
			create_comment_notifications: {
				Args: {
					p_body: string;
					p_comment_id: string;
					p_comment_title: string;
					p_mention_title: string;
					p_recipient_ids?: string[];
				};
				Returns: undefined;
			};
			create_device_link_request: {
				Args: {
					p_device_label: string;
					p_one_time_public_key: string;
					p_target_device_id?: string;
				};
				Returns: string;
			};
			delete_user_account: { Args: { p_user_id: string }; Returns: undefined };
			delete_user_sessions: { Args: { p_user_id: string }; Returns: number };
			fail_rotation: {
				Args: { p_error_code: string; p_rotation_id: string };
				Returns: undefined;
			};
			get_invite_details: {
				Args: { p_token: string };
				Returns: {
					email: string;
					role: string;
					workspace_id: string;
				}[];
			};
			get_user_role: {
				Args: { user_id: string; workspace_id: string };
				Returns: string;
			};
			is_v3_sealed: { Args: { p_value: string }; Returns: boolean };
			is_workspace_member: {
				Args: { user_id: string; workspace_id: string };
				Returns: boolean;
			};
			is_workspace_owner_or_admin: {
				Args: { uid: string; ws_id: string };
				Returns: boolean;
			};
			log_security_event: {
				Args: { p_metadata?: Json; p_type: string };
				Returns: undefined;
			};
			lookup_confirmed_user_id: { Args: { p_email: string }; Returns: string };
			mark_notifications_read: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
			record_recovery_attempt: { Args: { p_success: boolean }; Returns: Json };
			reject_device_link: {
				Args: { p_request_id: string };
				Returns: undefined;
			};
			remove_workspace_member: {
				Args: { p_user_id: string; p_workspace_id: string };
				Returns: undefined;
			};
			reserve_nonces: {
				Args: { p_ivs: string[]; p_key_id: string; p_key_scope: string };
				Returns: number;
			};
			retry_rotation: { Args: { p_rotation_id: string }; Returns: undefined };
			rotation_batch: {
				Args: { p_after: string; p_limit?: number; p_workspace_id: string };
				Returns: {
					ciphertext: string;
					field: string;
					record_key: string;
					row_id: string;
					secondary_id: string;
					table_name: string;
				}[];
			};
			workspace_member_public_keys: {
				Args: { p_workspace_id: string };
				Returns: {
					public_key: string;
					user_id: string;
				}[];
			};
		};
		Enums: {
			notification_type: "mention" | "comment";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			notification_type: ["mention", "comment"],
		},
	},
} as const;
