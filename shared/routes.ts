import { z } from 'zod';
import { 
  insertSoldierSchema, 
  insertAttendanceSchema, 
  insertViolationSchema,
  insertExcuseSchema,
  insertReportTemplateSchema,
  soldiers, 
  attendance,
  violations,
  excuses,
  activityLogs,
  reportTemplates
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const soldierResponseSchema = z.custom<typeof soldiers.$inferSelect>();
const attendanceResponseSchema = z.custom<typeof attendance.$inferSelect>();
const violationResponseSchema = z.custom<typeof violations.$inferSelect>();
const excuseResponseSchema = z.custom<typeof excuses.$inferSelect>();
const activityLogResponseSchema = z.custom<typeof activityLogs.$inferSelect>();

export const api = {
  soldiers: {
    list: {
      method: 'GET' as const,
      path: '/api/soldiers' as const,
      input: z.object({
        search: z.string().optional(),
        archived: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(soldierResponseSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/soldiers/:id' as const,
      responses: {
        200: soldierResponseSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/soldiers' as const,
      input: insertSoldierSchema,
      responses: {
        201: soldierResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/soldiers/:id' as const,
      input: insertSoldierSchema.partial().extend({ archived: z.boolean().optional() }),
      responses: {
        200: soldierResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  violations: {
    list: {
      method: 'GET' as const,
      path: '/api/violations' as const,
      input: z.object({
        soldierId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(violationResponseSchema),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/violations' as const,
      input: insertViolationSchema,
      responses: {
        201: violationResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/violations/:id' as const,
      input: insertViolationSchema.partial(),
      responses: {
        200: violationResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/violations/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    }
  },
  excuses: {
    list: {
      method: 'GET' as const,
      path: '/api/excuses' as const,
      input: z.object({
        soldierId: z.string().optional(),
        date: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(excuseResponseSchema),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/excuses' as const,
      input: insertExcuseSchema,
      responses: {
        201: excuseResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/excuses/:id' as const,
      input: insertExcuseSchema.partial(),
      responses: {
        200: excuseResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/excuses/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    }
  },
  activityLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/activity-logs' as const,
      input: z.object({
        actionType: z.string().optional(),
        entityType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).optional(),
      responses: {
        200: z.array(activityLogResponseSchema),
      },
    },
    undo: {
      method: 'POST' as const,
      path: '/api/activity-logs/:id/undo' as const,
      input: z.object({
        takeBackup: z.boolean().optional().default(false)
      }).optional(),
      responses: {
        200: z.object({ success: z.boolean(), backupUrl: z.string().optional() }),
        404: errorSchemas.notFound,
        400: errorSchemas.validation
      }
    }
  },
  backups: {
    list: {
      method: 'GET' as const,
      path: '/api/backups' as const,
      input: z.object({
        type: z.enum(['full', 'incremental']).optional(),
        sortBy: z.enum(['date', 'size', 'name']).optional(),
        search: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        minSize: z.number().optional(),
        maxSize: z.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          filename: z.string(),
          createdAt: z.string(),
          size: z.number(),
          type: z.string(),
          backupType: z.enum(['full', 'incremental']).optional(),
          description: z.string().optional()
        }))
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/backups' as const,
      input: z.object({
        backupType: z.enum(['full', 'incremental']).optional().default('full')
      }).optional(),
      responses: {
        201: z.object({ filename: z.string(), createdAt: z.string(), size: z.number(), type: z.enum(['full', 'incremental']) }),
        500: errorSchemas.internal
      }
    },
    restore: {
      method: 'POST' as const,
      path: '/api/backups/:filename/restore' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        500: errorSchemas.internal
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/backups/:filename' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound
      }
    },
    settings: {
      get: {
        method: 'GET' as const,
        path: '/api/backups/settings' as const,
        responses: {
          200: z.object({ autoBackupEnabled: z.boolean(), intervalHours: z.number() })
        }
      },
      update: {
        method: 'POST' as const,
        path: '/api/backups/settings' as const,
        input: z.object({ 
          autoBackupEnabled: z.boolean(), 
          intervalHours: z.number(),
          autoBackupType: z.enum(['full', 'incremental']).optional().default('full')
        }),
        responses: {
          200: z.object({ success: z.boolean() })
        }
      }
    }
  },
  attendance: {
    list: {
      method: 'GET' as const,
      path: '/api/attendance' as const,
      input: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        date: z.string().optional(), // for backward compatibility
        soldierId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(attendanceResponseSchema),
      },
    },
    createOrUpdate: {
      method: 'POST' as const,
      path: '/api/attendance' as const,
      input: insertAttendanceSchema,
      responses: {
        200: attendanceResponseSchema,
        201: attendanceResponseSchema,
        400: errorSchemas.validation,
      },
    },
    bulkCreateOrUpdate: {
      method: 'POST' as const,
      path: '/api/attendance/bulk' as const,
      input: z.object({
        records: z.array(insertAttendanceSchema)
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      }
    },
    report: {
      method: 'GET' as const,
      path: '/api/attendance/report/absences' as const,
      input: z.object({
        month: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          soldierId: z.number(),
          fullName: z.string(),
          militaryId: z.string(),
          rank: z.string(),
          unit: z.string(),
          absences: z.number()
        })),
      }
    }
  },
  reportTemplates: {
    list: {
      method: 'GET' as const,
      path: '/api/report-templates' as const,
      responses: {
        200: z.array(z.custom<typeof reportTemplates.$inferSelect>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/report-templates/:id' as const,
      responses: {
        200: z.custom<typeof reportTemplates.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/report-templates' as const,
      input: insertReportTemplateSchema,
      responses: {
        201: z.custom<typeof reportTemplates.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/report-templates/:id' as const,
      input: insertReportTemplateSchema.partial(),
      responses: {
        200: z.custom<typeof reportTemplates.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/report-templates/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
