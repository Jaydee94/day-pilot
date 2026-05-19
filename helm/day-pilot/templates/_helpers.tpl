{{/*
Expand the name of the chart.
*/}}
{{- define "day-pilot.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this.
*/}}
{{- define "day-pilot.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label.
*/}}
{{- define "day-pilot.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "day-pilot.labels" -}}
helm.sh/chart: {{ include "day-pilot.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "day-pilot.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "day-pilot.name" . }}-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "day-pilot.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "day-pilot.name" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "day-pilot.postgresql.selectorLabels" -}}
app.kubernetes.io/name: {{ include "day-pilot.name" . }}-postgresql
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Redis selector labels
*/}}
{{- define "day-pilot.redis.selectorLabels" -}}
app.kubernetes.io/name: {{ include "day-pilot.name" . }}-redis
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service account name
*/}}
{{- define "day-pilot.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "day-pilot.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Name of the Secret that holds sensitive environment variables.
Returns either the user-supplied existing secret (from .Values.secrets.existingSecret)
or the in-chart generated one (`<fullname>-secrets`). The external secret should
expose the same keys as templates/secret.yaml (OPENAI_API_KEY, DATABASE_URL, ...).
*/}}
{{- define "day-pilot.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "day-pilot.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Resolve an image reference, honoring global.imageRegistry.
Falls back to .Chart.AppVersion when image.tag is empty so that the chart
is always pinned to a concrete version rather than the floating "latest".
Usage: {{ include "day-pilot.image" (dict "root" . "image" .Values.backend.image) }}
*/}}
{{- define "day-pilot.image" -}}
{{- $registry := .root.Values.global.imageRegistry -}}
{{- $repo := .image.repository -}}
{{- $tag := .image.tag | default .root.Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repo $tag -}}
{{- else -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end -}}
{{- end }}

{{/*
PostgreSQL service host
*/}}
{{- define "day-pilot.postgresql.host" -}}
{{- printf "%s-postgresql" (include "day-pilot.fullname" .) }}
{{- end }}

{{/*
Redis service host
*/}}
{{- define "day-pilot.redis.host" -}}
{{- printf "%s-redis" (include "day-pilot.fullname" .) }}
{{- end }}
