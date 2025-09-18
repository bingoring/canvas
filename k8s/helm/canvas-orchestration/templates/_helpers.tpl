{{/*
Expand the name of the chart.
*/}}
{{- define "canvas-orchestration.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "canvas-orchestration.fullname" -}}
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
Create chart name and version as used by the chart label.
*/}}
{{- define "canvas-orchestration.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "canvas-orchestration.labels" -}}
helm.sh/chart: {{ include "canvas-orchestration.chart" . }}
{{ include "canvas-orchestration.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "canvas-orchestration.selectorLabels" -}}
app.kubernetes.io/name: {{ include "canvas-orchestration.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "canvas-orchestration.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "canvas-orchestration.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "canvas-orchestration.image" -}}
{{- $registryName := .Values.global.imageRegistry -}}
{{- $repositoryName := .Values.app.image.repository -}}
{{- $tag := .Values.app.image.tag | default .Chart.AppVersion | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else }}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end }}
{{- end }}

{{/*
Return the proper Storage Class
*/}}
{{- define "canvas-orchestration.storageClass" -}}
{{- if .Values.global.storageClass -}}
{{- if (eq "-" .Values.global.storageClass) -}}
{{- printf "storageClassName: \"\"" -}}
{{- else }}
{{- printf "storageClassName: %s" .Values.global.storageClass -}}
{{- end -}}
{{- else -}}
{{- if .Values.persistence.storageClass -}}
{{- if (eq "-" .Values.persistence.storageClass) -}}
{{- printf "storageClassName: \"\"" -}}
{{- else }}
{{- printf "storageClassName: %s" .Values.persistence.storageClass -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}