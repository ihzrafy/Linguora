
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "achievements": {
                  Row: {
                    "category": string,"created_at": string,"criteria": NonNullable<Json>,"description": string,"icon": string,"id": string,"is_active": boolean,"key": string,"name": string,"sort_order": number,"updated_at": string,"xp_reward": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"criteria": NonNullable<Json>,"description": string,"icon"?: string,"id"?: string,"is_active"?: boolean,"key": string,"name": string,"sort_order"?: number,"updated_at"?: string,"xp_reward"?: number
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"criteria"?: NonNullable<Json>,"description"?: string,"icon"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"name"?: string,"sort_order"?: number,"updated_at"?: string,"xp_reward"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ai_tutor_messages": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"input_tokens": number | null,"output_tokens": number | null,"role": string,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"input_tokens"?: number | null,"output_tokens"?: number | null,"role": string,"session_id": string,"user_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"input_tokens"?: number | null,"output_tokens"?: number | null,"role"?: string,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_tutor_messages_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "ai_tutor_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_tutor_sessions": {
                  Row: {
                    "created_at": string,"id": string,"mode": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mode"?: string,"title"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mode"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"assessment_answers": {
                  Row: {
                    "answered_at": string,"attempt_id": string,"feedback": string | null,"graded_at": string | null,"graded_by": string | null,"id": string,"is_correct": boolean | null,"max_points": number | null,"needs_manual_grading": boolean,"points_awarded": number | null,"question_id": string,"response": Json | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string,"attempt_id": string,"feedback"?: string | null,"graded_at"?: string | null,"graded_by"?: string | null,"id"?: string,"is_correct"?: boolean | null,"max_points"?: number | null,"needs_manual_grading"?: boolean,"points_awarded"?: number | null,"question_id": string,"response"?: Json | null,"user_id": string
                  }
                  Update: {
                    "answered_at"?: string,"attempt_id"?: string,"feedback"?: string | null,"graded_at"?: string | null,"graded_by"?: string | null,"id"?: string,"is_correct"?: boolean | null,"max_points"?: number | null,"needs_manual_grading"?: boolean,"points_awarded"?: number | null,"question_id"?: string,"response"?: Json | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_answers_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "assessment_attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"assessment_attempts": {
                  Row: {
                    "attempt_number": number,"created_at": string,"exam_id": string | null,"expires_at": string | null,"id": string,"kind": Database["public"]['Enums']["attempt_kind"],"lesson_id": string | null,"level_id": string | null,"max_points": number | null,"metadata": NonNullable<Json>,"option_orders": NonNullable<Json>,"pass_threshold": number | null,"passed": boolean | null,"pending_manual": boolean,"question_ids": (string)[],"quiz_id": string | null,"result": NonNullable<Json>,"score_percent": number | null,"score_points": number | null,"started_at": string,"status": Database["public"]['Enums']["attempt_status"],"submitted_at": string | null,"unit_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_number"?: number,"created_at"?: string,"exam_id"?: string | null,"expires_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["attempt_kind"],"lesson_id"?: string | null,"level_id"?: string | null,"max_points"?: number | null,"metadata"?: NonNullable<Json>,"option_orders"?: NonNullable<Json>,"pass_threshold"?: number | null,"passed"?: boolean | null,"pending_manual"?: boolean,"question_ids": (string)[],"quiz_id"?: string | null,"result"?: NonNullable<Json>,"score_percent"?: number | null,"score_points"?: number | null,"started_at"?: string,"status"?: Database["public"]['Enums']["attempt_status"],"submitted_at"?: string | null,"unit_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "attempt_number"?: number,"created_at"?: string,"exam_id"?: string | null,"expires_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["attempt_kind"],"lesson_id"?: string | null,"level_id"?: string | null,"max_points"?: number | null,"metadata"?: NonNullable<Json>,"option_orders"?: NonNullable<Json>,"pass_threshold"?: number | null,"passed"?: boolean | null,"pending_manual"?: boolean,"question_ids"?: (string)[],"quiz_id"?: string | null,"result"?: NonNullable<Json>,"score_percent"?: number | null,"score_points"?: number | null,"started_at"?: string,"status"?: Database["public"]['Enums']["attempt_status"],"submitted_at"?: string | null,"unit_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_attempts_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_attempts_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_attempts_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_attempts_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_attempts_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"metadata": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never,"metadata"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"metadata"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"blog_posts": {
                  Row: {
                    "author_id": string | null,"author_name": string,"body_md": string,"created_at": string,"excerpt": string,"id": string,"published_at": string | null,"slug": string,"status": Database["public"]['Enums']["content_status"],"tags": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"author_name"?: string,"body_md": string,"created_at"?: string,"excerpt": string,"id"?: string,"published_at"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"tags"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"author_name"?: string,"body_md"?: string,"created_at"?: string,"excerpt"?: string,"id"?: string,"published_at"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"tags"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bookmarks": {
                  Row: {
                    "created_at": string,"href": string,"id": string,"note": string | null,"target_id": string,"target_type": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"href": string,"id"?: string,"note"?: string | null,"target_id": string,"target_type": string,"title": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"href"?: string,"id"?: string,"note"?: string | null,"target_id"?: string,"target_type"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"certificates": {
                  Row: {
                    "attempt_id": string | null,"id": string,"issued_at": string,"level_id": string,"score_percent": number,"user_id": string,"verification_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_id"?: string | null,"id"?: string,"issued_at"?: string,"level_id": string,"score_percent": number,"user_id": string,"verification_code"?: string
                  }
                  Update: {
                    "attempt_id"?: string | null,"id"?: string,"issued_at"?: string,"level_id"?: string,"score_percent"?: number,"user_id"?: string,"verification_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "assessment_attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"challenges": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_active": boolean,"key": string,"metric": string,"period": string,"target": number,"title": string,"xp_reward": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"id"?: string,"is_active"?: boolean,"key": string,"metric": string,"period": string,"target": number,"title": string,"xp_reward": number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"metric"?: string,"period"?: string,"target"?: number,"title"?: string,"xp_reward"?: number
                  }
                  Relationships: [
                    
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"handled_at": string | null,"id": string,"message": string,"name": string,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"handled_at"?: string | null,"id"?: string,"message": string,"name": string,"subject": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"handled_at"?: string | null,"id"?: string,"message"?: string,"name"?: string,"subject"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_versions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"entity_id": string,"entity_type": string,"id": string,"note": string | null,"snapshot": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id": string,"entity_type": string,"id"?: string,"note"?: string | null,"snapshot": NonNullable<Json>,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"entity_type"?: string,"id"?: string,"note"?: string | null,"snapshot"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"course_enrollments": {
                  Row: {
                    "completed_at": string | null,"course_id": string,"enrolled_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"course_id": string,"enrolled_at"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"course_id"?: string,"enrolled_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"courses": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string,"id": string,"is_core": boolean,"level_id": string,"published_at": string | null,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"title": string,"track_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_core"?: boolean,"level_id": string,"published_at"?: string | null,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title": string,"track_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_core"?: boolean,"level_id"?: string,"published_at"?: string | null,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"track_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "learning_tracks"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_activity": {
                  Row: {
                    "activity_date": string,"correct_answers": number,"goal_met": boolean,"lessons_completed": number,"minutes_studied": number,"practice_xp": number,"questions_answered": number,"reviews_done": number,"user_id": string,"xp_earned": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"correct_answers"?: number,"goal_met"?: boolean,"lessons_completed"?: number,"minutes_studied"?: number,"practice_xp"?: number,"questions_answered"?: number,"reviews_done"?: number,"user_id": string,"xp_earned"?: number
                  }
                  Update: {
                    "activity_date"?: string,"correct_answers"?: number,"goal_met"?: boolean,"lessons_completed"?: number,"minutes_studied"?: number,"practice_xp"?: number,"questions_answered"?: number,"reviews_done"?: number,"user_id"?: string,"xp_earned"?: number
                  }
                  Relationships: [
                    
                  ]
                },"exam_questions": {
                  Row: {
                    "exam_id": string,"question_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "exam_id": string,"question_id": string,"sort_order"?: number
                  }
                  Update: {
                    "exam_id"?: string,"question_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_questions_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exam_questions_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"exams": {
                  Row: {
                    "blueprint": NonNullable<Json>,"cooldown_hours": number,"created_at": string,"description": string,"id": string,"kind": Database["public"]['Enums']["exam_kind"],"level_id": string | null,"max_attempts": number | null,"pass_threshold": number,"question_count": number,"shuffle_options": boolean,"slug": string,"status": Database["public"]['Enums']["content_status"],"time_limit_seconds": number | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blueprint"?: NonNullable<Json>,"cooldown_hours"?: number,"created_at"?: string,"description"?: string,"id"?: string,"kind": Database["public"]['Enums']["exam_kind"],"level_id"?: string | null,"max_attempts"?: number | null,"pass_threshold"?: number,"question_count"?: number,"shuffle_options"?: boolean,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"time_limit_seconds"?: number | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "blueprint"?: NonNullable<Json>,"cooldown_hours"?: number,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["exam_kind"],"level_id"?: string | null,"max_attempts"?: number | null,"pass_threshold"?: number,"question_count"?: number,"shuffle_options"?: boolean,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"time_limit_seconds"?: number | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exams_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"grammar_topics": {
                  Row: {
                    "category": Database["public"]['Enums']["grammar_category"],"comparison_md": string | null,"created_at": string,"examples": NonNullable<Json>,"explanation_md": string,"formulas": NonNullable<Json>,"id": string,"keywords": (string)[],"level_id": string,"mistakes": NonNullable<Json>,"related_lesson_ids": (string)[],"search": unknown,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["grammar_category"],"comparison_md"?: string | null,"created_at"?: string,"examples"?: NonNullable<Json>,"explanation_md": string,"formulas"?: NonNullable<Json>,"id"?: string,"keywords"?: (string)[],"level_id": string,"mistakes"?: NonNullable<Json>,"related_lesson_ids"?: (string)[],"search"?: unknown,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["grammar_category"],"comparison_md"?: string | null,"created_at"?: string,"examples"?: NonNullable<Json>,"explanation_md"?: string,"formulas"?: NonNullable<Json>,"id"?: string,"keywords"?: (string)[],"level_id"?: string,"mistakes"?: NonNullable<Json>,"related_lesson_ids"?: (string)[],"search"?: unknown,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grammar_topics_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"leaderboard_snapshots": {
                  Row: {
                    "created_at": string,"id": string,"period": string,"period_start": string,"rank": number,"user_id": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"period": string,"period_start": string,"rank": number,"user_id": string,"xp": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"period"?: string,"period_start"?: string,"rank"?: number,"user_id"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                },"learning_progress": {
                  Row: {
                    "best_quiz_score": number | null,"completed_at": string | null,"last_activity_at": string,"lesson_id": string,"mastered_at": string | null,"material_completed_at": string | null,"quiz_attempts": number,"started_at": string,"status": Database["public"]['Enums']["progress_status"],"user_id": string,"viewed_sections": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "best_quiz_score"?: number | null,"completed_at"?: string | null,"last_activity_at"?: string,"lesson_id": string,"mastered_at"?: string | null,"material_completed_at"?: string | null,"quiz_attempts"?: number,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"user_id": string,"viewed_sections"?: (string)[]
                  }
                  Update: {
                    "best_quiz_score"?: number | null,"completed_at"?: string | null,"last_activity_at"?: string,"lesson_id"?: string,"mastered_at"?: string | null,"material_completed_at"?: string | null,"quiz_attempts"?: number,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"user_id"?: string,"viewed_sections"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_tracks": {
                  Row: {
                    "created_at": string,"description": string,"goals": (string)[],"icon": string,"id": string,"name": string,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"goals"?: (string)[],"icon"?: string,"id"?: string,"name": string,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"goals"?: (string)[],"icon"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"lesson_prerequisites": {
                  Row: {
                    "lesson_id": string,"prerequisite_lesson_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "lesson_id": string,"prerequisite_lesson_id": string
                  }
                  Update: {
                    "lesson_id"?: string,"prerequisite_lesson_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_prerequisites_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_prerequisites_prerequisite_lesson_id_fkey"
      columns: ["prerequisite_lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_sections": {
                  Row: {
                    "body_md": string,"created_at": string,"data": NonNullable<Json>,"id": string,"kind": Database["public"]['Enums']["lesson_section_kind"],"lesson_id": string,"sort_order": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"kind": Database["public"]['Enums']["lesson_section_kind"],"lesson_id": string,"sort_order": number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body_md"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"kind"?: Database["public"]['Enums']["lesson_section_kind"],"lesson_id"?: string,"sort_order"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_sections_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "completion_criteria": string,"created_at": string,"created_by": string | null,"estimated_minutes": number,"id": string,"objectives": (string)[],"publish_at": string | null,"published_at": string | null,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"summary": string,"title": string,"unit_id": string,"updated_at": string,"updated_by": string | null,"version": number,"xp_reward": number
                  }
                  ComputedFields: never
                  Insert: {
                    "completion_criteria"?: string,"created_at"?: string,"created_by"?: string | null,"estimated_minutes"?: number,"id"?: string,"objectives"?: (string)[],"publish_at"?: string | null,"published_at"?: string | null,"slug": string,"sort_order": number,"status"?: Database["public"]['Enums']["content_status"],"summary"?: string,"title": string,"unit_id": string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number,"xp_reward"?: number
                  }
                  Update: {
                    "completion_criteria"?: string,"created_at"?: string,"created_by"?: string | null,"estimated_minutes"?: number,"id"?: string,"objectives"?: (string)[],"publish_at"?: string | null,"published_at"?: string | null,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"summary"?: string,"title"?: string,"unit_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number,"xp_reward"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"levels": {
                  Row: {
                    "code": string,"created_at": string,"description": string,"exam_pass_threshold": number,"explanation_language": string,"id": string,"name": string,"name_id": string,"objectives": (string)[],"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description": string,"exam_pass_threshold"?: number,"explanation_language"?: string,"id"?: string,"name": string,"name_id": string,"objectives"?: (string)[],"slug": string,"sort_order": number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string,"exam_pass_threshold"?: number,"explanation_language"?: string,"id"?: string,"name"?: string,"name_id"?: string,"objectives"?: (string)[],"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"listening_materials": {
                  Row: {
                    "accent": string | null,"audio_source": string,"audio_url": string | null,"created_at": string,"duration_seconds": number | null,"id": string,"kind": string,"level_id": string,"script": NonNullable<Json>,"slug": string,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"audio_source"?: string,"audio_url"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"kind": string,"level_id": string,"script"?: NonNullable<Json>,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "accent"?: string | null,"audio_source"?: string,"audio_url"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"kind"?: string,"level_id"?: string,"script"?: NonNullable<Json>,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listening_materials_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"listening_progress": {
                  Row: {
                    "best_score": number | null,"completed_at": string | null,"last_played_at": string,"material_id": string,"plays": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_score"?: number | null,"completed_at"?: string | null,"last_played_at"?: string,"material_id": string,"plays"?: number,"user_id": string
                  }
                  Update: {
                    "best_score"?: number | null,"completed_at"?: string | null,"last_played_at"?: string,"material_id"?: string,"plays"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listening_progress_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "listening_materials"
      referencedColumns: ["id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"kind": string,"lesson_id": string | null,"mood": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"lesson_id"?: string | null,"mood"?: string | null,"title"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"lesson_id"?: string | null,"mood"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"href": string | null,"id": string,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"href"?: string | null,"id"?: string,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"href"?: string | null,"id"?: string,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planned_lessons": {
                  Row: {
                    "created_at": string,"done": boolean,"id": string,"lesson_id": string | null,"planned_date": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"done"?: boolean,"id"?: string,"lesson_id"?: string | null,"planned_date": string,"title": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"done"?: boolean,"id"?: string,"lesson_id"?: string | null,"planned_date"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "planned_lessons_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active_track_id": string | null,"avatar_url": string | null,"bio": string | null,"created_at": string,"current_level_id": string | null,"daily_goal_minutes": number,"daily_goal_xp": number,"deleted_at": string | null,"display_name": string,"id": string,"leaderboard_opt_in": boolean,"learning_goal": string | null,"onboarding_completed_at": string | null,"placement_level_id": string | null,"preferences": NonNullable<Json>,"timezone": string,"updated_at": string,"username": string,"weekly_goal_minutes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active_track_id"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"current_level_id"?: string | null,"daily_goal_minutes"?: number,"daily_goal_xp"?: number,"deleted_at"?: string | null,"display_name": string,"id": string,"leaderboard_opt_in"?: boolean,"learning_goal"?: string | null,"onboarding_completed_at"?: string | null,"placement_level_id"?: string | null,"preferences"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"username": string,"weekly_goal_minutes"?: number
                  }
                  Update: {
                    "active_track_id"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"current_level_id"?: string | null,"daily_goal_minutes"?: number,"daily_goal_xp"?: number,"deleted_at"?: string | null,"display_name"?: string,"id"?: string,"leaderboard_opt_in"?: boolean,"learning_goal"?: string | null,"onboarding_completed_at"?: string | null,"placement_level_id"?: string | null,"preferences"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"username"?: string,"weekly_goal_minutes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_active_track_fk"
      columns: ["active_track_id"]
isOneToOne: false
      referencedRelation: "learning_tracks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_current_level_fk"
      columns: ["current_level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_placement_level_fk"
      columns: ["placement_level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"question_answer_keys": {
                  Row: {
                    "answer": NonNullable<Json>,"authored": NonNullable<Json>,"grading": NonNullable<Json>,"question_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"authored"?: NonNullable<Json>,"grading"?: NonNullable<Json>,"question_id": string,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"authored"?: NonNullable<Json>,"grading"?: NonNullable<Json>,"question_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_answer_keys_question_id_fkey"
      columns: ["question_id"]
isOneToOne: true
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"question_options": {
                  Row: {
                    "content": string,"id": string,"question_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"id"?: string,"question_id": string,"sort_order": number
                  }
                  Update: {
                    "content"?: string,"id"?: string,"question_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_options_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"question_tags": {
                  Row: {
                    "question_id": string,"tag": string
                  }
                  ComputedFields: never
                  Insert: {
                    "question_id": string,"tag": string
                  }
                  Update: {
                    "question_id"?: string,"tag"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_tags_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "auto_gradable": boolean,"category": Database["public"]['Enums']["skill_category"],"content_hash": string,"context_md": string | null,"created_at": string,"created_by": string | null,"data": NonNullable<Json>,"difficulty": number,"explanation": string,"external_key": string | null,"grammar_topic_id": string | null,"id": string,"instructions": string | null,"lesson_id": string | null,"level_id": string,"listening_id": string | null,"misconception": string | null,"objectives": (string)[],"passage_id": string | null,"points": number,"practice_only": boolean,"prompt": string,"review_notes": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"stage": Database["public"]['Enums']["question_stage"],"status": Database["public"]['Enums']["content_status"],"topic": string,"type": Database["public"]['Enums']["question_type"],"unit_id": string | null,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_gradable"?: boolean,"category": Database["public"]['Enums']["skill_category"],"content_hash": string,"context_md"?: string | null,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"difficulty"?: number,"explanation"?: string,"external_key"?: string | null,"grammar_topic_id"?: string | null,"id"?: string,"instructions"?: string | null,"lesson_id"?: string | null,"level_id": string,"listening_id"?: string | null,"misconception"?: string | null,"objectives"?: (string)[],"passage_id"?: string | null,"points"?: number,"practice_only"?: boolean,"prompt": string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"stage"?: Database["public"]['Enums']["question_stage"],"status"?: Database["public"]['Enums']["content_status"],"topic": string,"type": Database["public"]['Enums']["question_type"],"unit_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "auto_gradable"?: boolean,"category"?: Database["public"]['Enums']["skill_category"],"content_hash"?: string,"context_md"?: string | null,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"difficulty"?: number,"explanation"?: string,"external_key"?: string | null,"grammar_topic_id"?: string | null,"id"?: string,"instructions"?: string | null,"lesson_id"?: string | null,"level_id"?: string,"listening_id"?: string | null,"misconception"?: string | null,"objectives"?: (string)[],"passage_id"?: string | null,"points"?: number,"practice_only"?: boolean,"prompt"?: string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"stage"?: Database["public"]['Enums']["question_stage"],"status"?: Database["public"]['Enums']["content_status"],"topic"?: string,"type"?: Database["public"]['Enums']["question_type"],"unit_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_grammar_topic_id_fkey"
      columns: ["grammar_topic_id"]
isOneToOne: false
      referencedRelation: "grammar_topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_listening_id_fkey"
      columns: ["listening_id"]
isOneToOne: false
      referencedRelation: "listening_materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_passage_id_fkey"
      columns: ["passage_id"]
isOneToOne: false
      referencedRelation: "reading_passages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_questions": {
                  Row: {
                    "question_id": string,"quiz_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "question_id": string,"quiz_id": string,"sort_order"?: number
                  }
                  Update: {
                    "question_id"?: string,"quiz_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_questions_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_questions_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"quizzes": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"kind": Database["public"]['Enums']["quiz_kind"],"lesson_id": string | null,"max_attempts": number | null,"pass_threshold": number,"question_count": number | null,"shuffle_options": boolean,"shuffle_questions": boolean,"status": Database["public"]['Enums']["content_status"],"time_limit_seconds": number | null,"title": string,"unit_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"kind": Database["public"]['Enums']["quiz_kind"],"lesson_id"?: string | null,"max_attempts"?: number | null,"pass_threshold"?: number,"question_count"?: number | null,"shuffle_options"?: boolean,"shuffle_questions"?: boolean,"status"?: Database["public"]['Enums']["content_status"],"time_limit_seconds"?: number | null,"title": string,"unit_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["quiz_kind"],"lesson_id"?: string | null,"max_attempts"?: number | null,"pass_threshold"?: number,"question_count"?: number | null,"shuffle_options"?: boolean,"shuffle_questions"?: boolean,"status"?: Database["public"]['Enums']["content_status"],"time_limit_seconds"?: number | null,"title"?: string,"unit_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quizzes_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quizzes_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reading_passages": {
                  Row: {
                    "attribution": string | null,"body_md": string,"created_at": string,"estimated_minutes": number,"genre": string,"glossary": NonNullable<Json>,"id": string,"level_id": string,"slug": string,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "attribution"?: string | null,"body_md": string,"created_at"?: string,"estimated_minutes"?: number,"genre": string,"glossary"?: NonNullable<Json>,"id"?: string,"level_id": string,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"word_count"?: number
                  }
                  Update: {
                    "attribution"?: string | null,"body_md"?: string,"created_at"?: string,"estimated_minutes"?: number,"genre"?: string,"glossary"?: NonNullable<Json>,"id"?: string,"level_id"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"word_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "reading_passages_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"reading_progress": {
                  Row: {
                    "best_score": number | null,"completed_at": string | null,"last_read_at": string,"passage_id": string,"time_spent_seconds": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_score"?: number | null,"completed_at"?: string | null,"last_read_at"?: string,"passage_id": string,"time_spent_seconds"?: number,"user_id": string
                  }
                  Update: {
                    "best_score"?: number | null,"completed_at"?: string | null,"last_read_at"?: string,"passage_id"?: string,"time_spent_seconds"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reading_progress_passage_id_fkey"
      columns: ["passage_id"]
isOneToOne: false
      referencedRelation: "reading_passages"
      referencedColumns: ["id"]
    }
                  ]
                },"review_schedules": {
                  Row: {
                    "created_at": string,"due_at": string,"ease_factor": number,"id": string,"interval_days": number,"item_id": string,"item_ref": string,"item_type": Database["public"]['Enums']["review_item_type"],"lapses": number,"last_grade": number | null,"last_reviewed_at": string | null,"mastery": string,"repetitions": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"due_at"?: string,"ease_factor"?: number,"id"?: string,"interval_days"?: number,"item_id": string,"item_ref"?: string,"item_type": Database["public"]['Enums']["review_item_type"],"lapses"?: number,"last_grade"?: number | null,"last_reviewed_at"?: string | null,"mastery"?: string,"repetitions"?: number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"due_at"?: string,"ease_factor"?: number,"id"?: string,"interval_days"?: number,"item_id"?: string,"item_ref"?: string,"item_type"?: Database["public"]['Enums']["review_item_type"],"lapses"?: number,"last_grade"?: number | null,"last_reviewed_at"?: string | null,"mastery"?: string,"repetitions"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "permission": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "permission": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "permission"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_role_fkey"
      columns: ["role"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["role"]
    }
                  ]
                },"roles": {
                  Row: {
                    "description": string,"name": string,"rank": number,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"name": string,"rank": number,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "description"?: string,"name"?: string,"rank"?: number,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"skill_assessments": {
                  Row: {
                    "attempt_id": string | null,"category": Database["public"]['Enums']["skill_category"],"created_at": string,"estimated_level": string | null,"id": string,"questions_count": number,"score_percent": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_id"?: string | null,"category": Database["public"]['Enums']["skill_category"],"created_at"?: string,"estimated_level"?: string | null,"id"?: string,"questions_count": number,"score_percent": number,"user_id": string
                  }
                  Update: {
                    "attempt_id"?: string | null,"category"?: Database["public"]['Enums']["skill_category"],"created_at"?: string,"estimated_level"?: string | null,"id"?: string,"questions_count"?: number,"score_percent"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skill_assessments_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "assessment_attempts"
      referencedColumns: ["id"]
    }
                  ]
                },"speaking_prompts": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"level_id": string,"prompt_md": string,"sample_answer": string | null,"slug": string,"status": Database["public"]['Enums']["content_status"],"target_phrases": (string)[],"tips": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"level_id": string,"prompt_md": string,"sample_answer"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"target_phrases"?: (string)[],"tips"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"level_id"?: string,"prompt_md"?: string,"sample_answer"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"target_phrases"?: (string)[],"tips"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "speaking_prompts_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"speaking_sessions": {
                  Row: {
                    "audio_path": string | null,"created_at": string,"duration_seconds": number | null,"id": string,"matched_phrases": (string)[],"mode": string,"prompt_id": string | null,"recognition_available": boolean,"recognition_confidence": number | null,"reflection": string | null,"self_rating": NonNullable<Json>,"transcript": string | null,"user_id": string,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_path"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"matched_phrases"?: (string)[],"mode"?: string,"prompt_id"?: string | null,"recognition_available"?: boolean,"recognition_confidence"?: number | null,"reflection"?: string | null,"self_rating"?: NonNullable<Json>,"transcript"?: string | null,"user_id": string,"word_count"?: number
                  }
                  Update: {
                    "audio_path"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"matched_phrases"?: (string)[],"mode"?: string,"prompt_id"?: string | null,"recognition_available"?: boolean,"recognition_confidence"?: number | null,"reflection"?: string | null,"self_rating"?: NonNullable<Json>,"transcript"?: string | null,"user_id"?: string,"word_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "speaking_sessions_prompt_id_fkey"
      columns: ["prompt_id"]
isOneToOne: false
      referencedRelation: "speaking_prompts"
      referencedColumns: ["id"]
    }
                  ]
                },"study_plans": {
                  Row: {
                    "reminder_time": string | null,"reminders_enabled": boolean,"target_date": string | null,"target_level_id": string | null,"updated_at": string,"user_id": string,"weekly_schedule": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "reminder_time"?: string | null,"reminders_enabled"?: boolean,"target_date"?: string | null,"target_level_id"?: string | null,"updated_at"?: string,"user_id": string,"weekly_schedule"?: NonNullable<Json>
                  }
                  Update: {
                    "reminder_time"?: string | null,"reminders_enabled"?: boolean,"target_date"?: string | null,"target_level_id"?: string | null,"updated_at"?: string,"user_id"?: string,"weekly_schedule"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_plans_target_level_id_fkey"
      columns: ["target_level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "created_at": string,"duration_seconds": number,"ended_at": string | null,"id": string,"lesson_id": string | null,"mode": string,"notes": string | null,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_seconds"?: number,"ended_at"?: string | null,"id"?: string,"lesson_id"?: string | null,"mode"?: string,"notes"?: string | null,"started_at": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"duration_seconds"?: number,"ended_at"?: string | null,"id"?: string,"lesson_id"?: string | null,"mode"?: string,"notes"?: string | null,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_sessions_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"system_settings": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"units": {
                  Row: {
                    "course_id": string,"created_at": string,"created_by": string | null,"description": string,"id": string,"objectives": (string)[],"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"objectives"?: (string)[],"slug": string,"sort_order": number,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"objectives"?: (string)[],"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"user_achievements": {
                  Row: {
                    "achievement_id": string,"seen_at": string | null,"unlocked_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achievement_id": string,"seen_at"?: string | null,"unlocked_at"?: string,"user_id": string
                  }
                  Update: {
                    "achievement_id"?: string,"seen_at"?: string | null,"unlocked_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_achievements_achievement_id_fkey"
      columns: ["achievement_id"]
isOneToOne: false
      referencedRelation: "achievements"
      referencedColumns: ["id"]
    }
                  ]
                },"user_level_unlocks": {
                  Row: {
                    "level_id": string,"source": string,"unlocked_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "level_id": string,"source": string,"unlocked_at"?: string,"user_id": string
                  }
                  Update: {
                    "level_id"?: string,"source"?: string,"unlocked_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_level_unlocks_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"user_question_stats": {
                  Row: {
                    "last_correct": boolean | null,"last_seen_at": string,"question_id": string,"times_correct": number,"times_seen": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "last_correct"?: boolean | null,"last_seen_at"?: string,"question_id": string,"times_correct"?: number,"times_seen"?: number,"user_id": string
                  }
                  Update: {
                    "last_correct"?: boolean | null,"last_seen_at"?: string,"question_id"?: string,"times_correct"?: number,"times_seen"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_question_stats_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_role_fkey"
      columns: ["role"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["role"]
    }
                  ]
                },"user_stats": {
                  Row: {
                    "correct_answers": number,"current_streak": number,"last_active_date": string | null,"lessons_completed": number,"longest_streak": number,"perfect_scores": number,"questions_answered": number,"total_xp": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correct_answers"?: number,"current_streak"?: number,"last_active_date"?: string | null,"lessons_completed"?: number,"longest_streak"?: number,"perfect_scores"?: number,"questions_answered"?: number,"total_xp"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "correct_answers"?: number,"current_streak"?: number,"last_active_date"?: string | null,"lessons_completed"?: number,"longest_streak"?: number,"perfect_scores"?: number,"questions_answered"?: number,"total_xp"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_vocabulary": {
                  Row: {
                    "added_at": string,"collection_id": string | null,"custom_example": string | null,"custom_meaning": string | null,"custom_word": string | null,"entry_id": string | null,"id": string,"is_favorite": boolean,"note": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"collection_id"?: string | null,"custom_example"?: string | null,"custom_meaning"?: string | null,"custom_word"?: string | null,"entry_id"?: string | null,"id"?: string,"is_favorite"?: boolean,"note"?: string | null,"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"collection_id"?: string | null,"custom_example"?: string | null,"custom_meaning"?: string | null,"custom_word"?: string | null,"entry_id"?: string | null,"id"?: string,"is_favorite"?: boolean,"note"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_vocabulary_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "vocabulary_collections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_vocabulary_entry_id_fkey"
      columns: ["entry_id"]
isOneToOne: false
      referencedRelation: "vocabulary_entries"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_collections": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vocabulary_entries": {
                  Row: {
                    "antonyms": (string)[],"audio_url": string | null,"collocations": (string)[],"created_at": string,"definition": string,"examples": NonNullable<Json>,"id": string,"ipa": string | null,"level_id": string | null,"meaning_id": string,"part_of_speech": string,"phrases": (string)[],"related_words": (string)[],"status": Database["public"]['Enums']["content_status"],"synonyms": (string)[],"topic": string | null,"updated_at": string,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "antonyms"?: (string)[],"audio_url"?: string | null,"collocations"?: (string)[],"created_at"?: string,"definition": string,"examples"?: NonNullable<Json>,"id"?: string,"ipa"?: string | null,"level_id"?: string | null,"meaning_id": string,"part_of_speech": string,"phrases"?: (string)[],"related_words"?: (string)[],"status"?: Database["public"]['Enums']["content_status"],"synonyms"?: (string)[],"topic"?: string | null,"updated_at"?: string,"word": string
                  }
                  Update: {
                    "antonyms"?: (string)[],"audio_url"?: string | null,"collocations"?: (string)[],"created_at"?: string,"definition"?: string,"examples"?: NonNullable<Json>,"id"?: string,"ipa"?: string | null,"level_id"?: string | null,"meaning_id"?: string,"part_of_speech"?: string,"phrases"?: (string)[],"related_words"?: (string)[],"status"?: Database["public"]['Enums']["content_status"],"synonyms"?: (string)[],"topic"?: string | null,"updated_at"?: string,"word"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_entries_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"writing_prompts": {
                  Row: {
                    "created_at": string,"id": string,"instructions_md": string,"kind": string,"level_id": string,"max_words": number,"min_words": number,"model_answer": string | null,"rubric_id": string | null,"slug": string,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"instructions_md": string,"kind": string,"level_id": string,"max_words"?: number,"min_words"?: number,"model_answer"?: string | null,"rubric_id"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"instructions_md"?: string,"kind"?: string,"level_id"?: string,"max_words"?: number,"min_words"?: number,"model_answer"?: string | null,"rubric_id"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "writing_prompts_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "writing_prompts_rubric_id_fkey"
      columns: ["rubric_id"]
isOneToOne: false
      referencedRelation: "writing_rubrics"
      referencedColumns: ["id"]
    }
                  ]
                },"writing_rubrics": {
                  Row: {
                    "created_at": string,"criteria": NonNullable<Json>,"description": string,"id": string,"key": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"criteria": NonNullable<Json>,"description"?: string,"id"?: string,"key": string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"description"?: string,"id"?: string,"key"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"writing_submissions": {
                  Row: {
                    "ai_feedback": Json | null,"content": string,"created_at": string,"id": string,"prompt_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"reviewer_feedback": string | null,"rubric_scores": Json | null,"self_assessment": NonNullable<Json>,"status": string,"submitted_at": string | null,"title": string | null,"updated_at": string,"user_id": string,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_feedback"?: Json | null,"content"?: string,"created_at"?: string,"id"?: string,"prompt_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"reviewer_feedback"?: string | null,"rubric_scores"?: Json | null,"self_assessment"?: NonNullable<Json>,"status"?: string,"submitted_at"?: string | null,"title"?: string | null,"updated_at"?: string,"user_id": string,"word_count"?: number
                  }
                  Update: {
                    "ai_feedback"?: Json | null,"content"?: string,"created_at"?: string,"id"?: string,"prompt_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"reviewer_feedback"?: string | null,"rubric_scores"?: Json | null,"self_assessment"?: NonNullable<Json>,"status"?: string,"submitted_at"?: string | null,"title"?: string | null,"updated_at"?: string,"user_id"?: string,"word_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "writing_submissions_prompt_id_fkey"
      columns: ["prompt_id"]
isOneToOne: false
      referencedRelation: "writing_prompts"
      referencedColumns: ["id"]
    }
                  ]
                },"xp_transactions": {
                  Row: {
                    "activity_date": string,"amount": number,"created_at": string,"id": string,"idempotency_key": string,"source": Database["public"]['Enums']["xp_source"],"source_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"amount": number,"created_at"?: string,"id"?: string,"idempotency_key": string,"source": Database["public"]['Enums']["xp_source"],"source_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"amount"?: number,"created_at"?: string,"id"?: string,"idempotency_key"?: string,"source"?: Database["public"]['Enums']["xp_source"],"source_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "achievement_metric":
{ Args: { "p_metric": string,"p_user": string }; Returns: number
                           },
"admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_question_stats":
{ Args: { "p_limit"?: number }; Returns: {
              "accuracy": number,"answers": number,"level_code": string,"prompt": string,"question_id": string,"type": Database["public"]['Enums']["question_type"]
            }[]
                           },
"award_xp":
{ Args: { "p_amount": number,"p_key": string,"p_source": Database["public"]['Enums']["xp_source"],"p_source_id": string,"p_user": string }; Returns: number
                           },
"can_access_lesson":
{ Args: { "p_lesson": string }; Returns: boolean
                           },
"can_edit_lesson_children":
{ Args: { "p_lesson": string }; Returns: boolean
                           },
"can_edit_question_children":
{ Args: { "p_question": string }; Returns: boolean
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"cms_duplicate_lesson":
{ Args: { "p_lesson": string }; Returns: string
                           },
"cms_restore_version":
{ Args: { "p_version": string }; Returns: undefined
                           },
"cms_save_lesson":
{ Args: { "p_lesson": Json,"p_note"?: string,"p_prerequisites": (string)[],"p_sections": Json }; Returns: string
                           },
"cms_save_question":
{ Args: { "p_answer": Json,"p_authored"?: Json,"p_grading": Json,"p_note"?: string,"p_options": Json,"p_question": Json,"p_tags": (string)[] }; Returns: string
                           },
"course_path_for":
{ Args: { "p_course": string,"p_user": string }; Returns: {
              "best_score": number,"lesson_id": string,"lesson_sort": number,"lesson_status": string,"lessons_done": boolean,"unit_completed": boolean,"unit_id": string,"unit_sort": number,"unit_test_passed": boolean,"unit_test_quiz_id": string,"unit_unlocked": boolean
            }[]
                           },
"evaluate_achievements":
{ Args: { "p_user": string }; Returns: (string)[]
                           },
"finalize_attempt":
{ Args: { "p_answers": Json,"p_attempt": string,"p_outcome": Json }; Returns: Json
                           },
"get_course_path":
{ Args: { "p_course": string }; Returns: {
              "best_score": number,"lesson_id": string,"lesson_sort": number,"lesson_status": string,"lessons_done": boolean,"unit_completed": boolean,"unit_id": string,"unit_sort": number,"unit_test_passed": boolean,"unit_test_quiz_id": string,"unit_unlocked": boolean
            }[]
                           },
"get_leaderboard":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_period"?: string }; Returns: {
              "avatar_url": string,"display_name": string,"is_me": boolean,"rank": number,"total_count": number,"username": string,"xp": number
            }[]
                           },
"get_my_leaderboard_rank":
{ Args: { "p_period"?: string }; Returns: {
              "rank": number,"xp": number
            }[]
                           },
"grade_manual_answer":
{ Args: { "p_answer": string,"p_feedback": string,"p_points": number }; Returns: undefined
                           },
"has_permission":
{ Args: { "p_permission": string }; Returns: boolean
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lesson_accessible_for":
{ Args: { "p_lesson": string,"p_user": string }; Returns: boolean
                           },
"lesson_snapshot":
{ Args: { "p_lesson": string }; Returns: Json
                           },
"level_exam_unlocked_for":
{ Args: { "p_level": string,"p_user": string }; Returns: boolean
                           },
"log_audit":
{ Args: { "p_action": string,"p_entity_id": string,"p_entity_type": string,"p_metadata"?: Json }; Returns: undefined
                           },
"my_category_performance":
{ Args: { "p_days"?: number }; Returns: {
              "answers": number,"category": Database["public"]['Enums']["skill_category"],"correct": number,"unique_questions": number
            }[]
                           },
"my_learning_summary":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"my_question_type_performance":
{ Args: { "p_days"?: number }; Returns: {
              "answers": number,"correct": number,"type": Database["public"]['Enums']["question_type"]
            }[]
                           },
"my_topic_performance":
{ Args: { "p_days"?: number,"p_limit"?: number }; Returns: {
              "answers": number,"category": Database["public"]['Enums']["skill_category"],"correct": number,"topic": string
            }[]
                           },
"public_platform_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"publish_scheduled_content":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"question_snapshot":
{ Args: { "p_question": string }; Returns: Json
                           },
"record_activity":
{ Args: { "p_correct"?: number,"p_lessons"?: number,"p_minutes"?: number,"p_questions"?: number,"p_reviews"?: number,"p_user": string }; Returns: undefined
                           },
"record_practice_answer":
{ Args: { "p_attempt": string,"p_is_correct": boolean,"p_max_points": number,"p_needs_manual"?: boolean,"p_points": number,"p_question": string,"p_response": Json }; Returns: Json
                           },
"review_writing_submission":
{ Args: { "p_feedback": string,"p_scores": Json,"p_submission": string }; Returns: undefined
                           },
"snapshot_leaderboard":
{ Args: { "p_period": string }; Returns: number
                           },
"snapshot_version":
{ Args: { "p_entity_id": string,"p_entity_type": string,"p_note": string,"p_snapshot": Json }; Returns: number
                           },
"user_has_permission":
{ Args: { "p_permission": string,"p_user": string }; Returns: boolean
                           },
"user_local_date":
{ Args: { "p_user": string }; Returns: string
                           }
          }
          Enums: {
            "app_role": "super_admin"|"admin"|"content_editor"|"reviewer"|"student","attempt_kind": "lesson_quiz"|"unit_test"|"level_exam"|"placement"|"practice"|"daily_challenge"|"review","attempt_status": "in_progress"|"submitted"|"graded"|"expired"|"abandoned","content_status": "draft"|"in_review"|"published"|"archived","exam_kind": "level_exam"|"placement","grammar_category": "tense"|"sentence_structure"|"parts_of_speech"|"modals"|"conditionals"|"clauses"|"voice"|"reported_speech"|"punctuation"|"common_mistakes","lesson_section_kind": "objectives"|"explanation"|"examples"|"vocabulary"|"grammar"|"mistakes"|"guided_practice"|"independent_practice"|"mini_assessment"|"summary"|"review_cards"|"completion"|"media","progress_status": "in_progress"|"completed"|"mastered"|"needs_review","question_stage": "guided"|"independent"|"quiz"|"unit_test"|"exam"|"placement","question_type": "single_choice"|"multiple_select"|"fill_blank"|"dropdown"|"drag_drop"|"word_order"|"sentence_reconstruction"|"matching"|"error_identification"|"sentence_correction"|"sentence_transformation"|"translation"|"reading_comprehension"|"listening_comprehension"|"dialogue_completion"|"contextual_vocabulary"|"short_answer"|"essay"|"dictation"|"speaking_response","quiz_kind": "lesson_quiz"|"unit_test"|"practice_set","review_item_type": "vocabulary"|"user_vocabulary"|"question"|"lesson"|"review_card","skill_category": "grammar"|"vocabulary"|"reading"|"listening"|"speaking"|"writing"|"pronunciation"|"conversation"|"academic"|"business"|"mixed","xp_source": "lesson_complete"|"lesson_mastered"|"quiz_pass"|"unit_test_pass"|"exam_pass"|"placement"|"practice"|"review"|"daily_goal"|"daily_challenge"|"challenge"|"achievement"|"perfect_score"|"admin_adjust"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["super_admin", "admin", "content_editor", "reviewer", "student"],"attempt_kind": ["lesson_quiz", "unit_test", "level_exam", "placement", "practice", "daily_challenge", "review"],"attempt_status": ["in_progress", "submitted", "graded", "expired", "abandoned"],"content_status": ["draft", "in_review", "published", "archived"],"exam_kind": ["level_exam", "placement"],"grammar_category": ["tense", "sentence_structure", "parts_of_speech", "modals", "conditionals", "clauses", "voice", "reported_speech", "punctuation", "common_mistakes"],"lesson_section_kind": ["objectives", "explanation", "examples", "vocabulary", "grammar", "mistakes", "guided_practice", "independent_practice", "mini_assessment", "summary", "review_cards", "completion", "media"],"progress_status": ["in_progress", "completed", "mastered", "needs_review"],"question_stage": ["guided", "independent", "quiz", "unit_test", "exam", "placement"],"question_type": ["single_choice", "multiple_select", "fill_blank", "dropdown", "drag_drop", "word_order", "sentence_reconstruction", "matching", "error_identification", "sentence_correction", "sentence_transformation", "translation", "reading_comprehension", "listening_comprehension", "dialogue_completion", "contextual_vocabulary", "short_answer", "essay", "dictation", "speaking_response"],"quiz_kind": ["lesson_quiz", "unit_test", "practice_set"],"review_item_type": ["vocabulary", "user_vocabulary", "question", "lesson", "review_card"],"skill_category": ["grammar", "vocabulary", "reading", "listening", "speaking", "writing", "pronunciation", "conversation", "academic", "business", "mixed"],"xp_source": ["lesson_complete", "lesson_mastered", "quiz_pass", "unit_test_pass", "exam_pass", "placement", "practice", "review", "daily_goal", "daily_challenge", "challenge", "achievement", "perfect_score", "admin_adjust"]
          }
        }
} as const
