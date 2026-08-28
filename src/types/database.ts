export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "14.17";
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
					prompt: string;
					response: string | null;
					tokens_used: number | null;
					user_id: string;
				};
				Insert: {
					card_id?: string | null;
					created_at?: string;
					id?: string;
					model: string;
					page_id?: string | null;
					prompt: string;
					response?: string | null;
					tokens_used?: number | null;
					user_id: string;
				};
				Update: {
					card_id?: string | null;
					created_at?: string;
					id?: string;
					model?: string;
					page_id?: string | null;
					prompt?: string;
					response?: string | null;
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
			attachments: {
				Row: {
					card_id: string | null;
					created_at: string;
					file_path: string;
					file_size: number | null;
					filename: string;
					id: string;
					mime_type: string | null;
					page_id: string;
					uploader_id: string;
				};
				Insert: {
					card_id?: string | null;
					created_at?: string;
					file_path: string;
					file_size?: number | null;
					filename: string;
					id?: string;
					mime_type?: string | null;
					page_id: string;
					uploader_id: string;
				};
				Update: {
					card_id?: string | null;
					created_at?: string;
					file_path?: string;
					file_size?: number | null;
					filename?: string;
					id?: string;
					mime_type?: string | null;
					page_id?: string;
					uploader_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "attachments_card_id_fkey";
						columns: ["card_id"];
						isOneToOne: false;
						referencedRelation: "cards";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "attachments_page_id_fkey";
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
					column_id: string;
					created_at: string;
					description: string | null;
					due_date: string | null;
					id: string;
					page_id: string;
					position: number;
					title: string;
					updated_at: string;
				};
				Insert: {
					assignee_ids?: string[] | null;
					column_id: string;
					created_at?: string;
					description?: string | null;
					due_date?: string | null;
					id?: string;
					page_id: string;
					position?: number;
					title: string;
					updated_at?: string;
				};
				Update: {
					assignee_ids?: string[] | null;
					column_id?: string;
					created_at?: string;
					description?: string | null;
					due_date?: string | null;
					id?: string;
					page_id?: string;
					position?: number;
					title?: string;
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
					color: string | null;
					created_at: string;
					id: string;
					page_id: string;
					position: number;
					title: string;
					updated_at: string;
				};
				Insert: {
					color?: string | null;
					created_at?: string;
					id?: string;
					page_id: string;
					position?: number;
					title: string;
					updated_at?: string;
				};
				Update: {
					color?: string | null;
					created_at?: string;
					id?: string;
					page_id?: string;
					position?: number;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "columns_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: false;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
				];
			};
			comment_threads: {
				Row: {
					card_id: string | null;
					created_at: string;
					id: string;
					page_id: string;
				};
				Insert: {
					card_id?: string | null;
					created_at?: string;
					id?: string;
					page_id: string;
				};
				Update: {
					card_id?: string | null;
					created_at?: string;
					id?: string;
					page_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "comment_threads_card_id_fkey";
						columns: ["card_id"];
						isOneToOne: false;
						referencedRelation: "cards";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "comment_threads_page_id_fkey";
						columns: ["page_id"];
						isOneToOne: false;
						referencedRelation: "pages";
						referencedColumns: ["id"];
					},
				];
			};
			comments: {
				Row: {
					author_id: string;
					content: string;
					created_at: string;
					id: string;
					thread_id: string;
					updated_at: string;
				};
				Insert: {
					author_id: string;
					content: string;
					created_at?: string;
					id?: string;
					thread_id: string;
					updated_at?: string;
				};
				Update: {
					author_id?: string;
					content?: string;
					created_at?: string;
					id?: string;
					thread_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "comments_thread_id_fkey";
						columns: ["thread_id"];
						isOneToOne: false;
						referencedRelation: "comment_threads";
						referencedColumns: ["id"];
					},
				];
			};
			page_content: {
				Row: {
					content: Json;
					created_at: string;
					id: string;
					page_id: string;
					updated_at: string;
					version: number;
				};
				Insert: {
					content?: Json;
					created_at?: string;
					id?: string;
					page_id: string;
					updated_at?: string;
					version?: number;
				};
				Update: {
					content?: Json;
					created_at?: string;
					id?: string;
					page_id?: string;
					updated_at?: string;
					version?: number;
				};
				Relationships: [
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
						foreignKeyName: "page_visits_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
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
					title: string;
					updated_at: string;
					workspace_id: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					icon?: string | null;
					id?: string;
					is_deleted?: boolean;
					is_favorite?: boolean;
					kind: string;
					title?: string;
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
					title?: string;
					updated_at?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "pages_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			tags: {
				Row: {
					color: string;
					created_at: string;
					id: string;
					name: string;
					workspace_id: string;
				};
				Insert: {
					color?: string;
					created_at?: string;
					id?: string;
					name: string;
					workspace_id: string;
				};
				Update: {
					color?: string;
					created_at?: string;
					id?: string;
					name?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "tags_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			todos: {
				Row: {
					content: string | null;
					created_at: string;
					id: number;
				};
				Insert: {
					content?: string | null;
					created_at?: string;
					id?: number;
				};
				Update: {
					content?: string | null;
					created_at?: string;
					id?: number;
				};
				Relationships: [];
			};
			workspace_members: {
				Row: {
					created_at: string;
					email: string;
					id: string;
					role: string;
					user_id: string | null;
					workspace_id: string;
				};
				Insert: {
					created_at?: string;
					email?: string;
					id?: string;
					role: string;
					user_id?: string | null;
					workspace_id: string;
				};
				Update: {
					created_at?: string;
					email?: string;
					id?: string;
					role?: string;
					user_id?: string | null;
					workspace_id?: string;
				};
				Relationships: [
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
					description: string | null;
					id: string;
					name: string;
					owner_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					default_page_kind?: string;
					description?: string | null;
					id?: string;
					name: string;
					owner_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					default_page_kind?: string;
					description?: string | null;
					id?: string;
					name?: string;
					owner_id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			get_user_role: {
				Args: { user_id: string; workspace_id: string };
				Returns: string;
			};
			is_workspace_member: {
				Args: { user_id: string; workspace_id: string };
				Returns: boolean;
			};
		};
		Enums: {
			[_ in never]: never;
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
	public: {
		Enums: {},
	},
} as const;
