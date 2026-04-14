import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Pdf4 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF4.dev',
		name: 'pdf4',
		icon: { light: 'file:pdf4.svg', dark: 'file:pdf4.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate PDFs from HTML templates via the PDF4.dev API',
		defaults: {
			name: 'PDF4.dev',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'pdf4Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'PDF', value: 'pdf' },
					{ name: 'Template', value: 'template' },
				],
				default: 'pdf',
			},

			// PDF operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['pdf'] } },
				options: [
					{
						name: 'Render From Template',
						value: 'renderTemplate',
						description: 'Generate a PDF from a saved template with variable data',
						action: 'Render a PDF from a template',
					},
					{
						name: 'Render From HTML',
						value: 'renderHtml',
						description: 'Generate a PDF from raw HTML without saving a template',
						action: 'Render a PDF from raw HTML',
					},
				],
				default: 'renderTemplate',
			},

			// Template operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List all templates in your account',
						action: 'List templates',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single template by ID or slug',
						action: 'Get a template',
					},
				],
				default: 'list',
			},

			// Render from template
			{
				displayName: 'Template ID or Slug',
				name: 'templateId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'tmpl_abc123 or invoice',
				displayOptions: { show: { resource: ['pdf'], operation: ['renderTemplate'] } },
				description: 'The template ID (tmpl_...) or slug to render',
			},
			{
				displayName: 'Data (JSON)',
				name: 'data',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['pdf'], operation: ['renderTemplate'] } },
				description: 'Key-value pairs for Handlebars variables in the template',
			},

			// Render from HTML
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 6 },
				required: true,
				default: '<h1>Hello {{name}}</h1>',
				displayOptions: { show: { resource: ['pdf'], operation: ['renderHtml'] } },
				description: 'Raw HTML to render. Supports Handlebars variables like {{name}}.',
			},
			{
				displayName: 'Data (JSON)',
				name: 'data',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['pdf'], operation: ['renderHtml'] } },
				description: 'Key-value pairs for Handlebars variables in the HTML',
			},

			// Template get
			{
				displayName: 'Template ID or Slug',
				name: 'templateId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['get'] } },
			},

			// Shared: render output options
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				displayOptions: { show: { resource: ['pdf'] } },
				options: [
					{
						name: 'Binary (Attach to Item)',
						value: 'binary',
						description: 'Return the PDF as a binary property for downstream nodes',
					},
					{
						name: 'Base64',
						value: 'base64',
						description: 'Return the PDF as a base64-encoded string in JSON',
					},
				],
				default: 'binary',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: { show: { resource: ['pdf'], output: ['binary'] } },
				description: 'Name of the binary property to write the PDF to',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'document.pdf',
				displayOptions: { show: { resource: ['pdf'] } },
				description: 'File name to set on the returned PDF',
			},

			// Advanced format overrides
			{
				displayName: 'PDF Format Overrides',
				name: 'formatOverrides',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['pdf'] } },
				options: [
					{
						displayName: 'Preset',
						name: 'preset',
						type: 'options',
						options: [
							{ name: 'A4', value: 'a4' },
							{ name: 'A4 Landscape', value: 'a4-landscape' },
							{ name: 'Custom', value: 'custom' },
							{ name: 'Letter', value: 'letter' },
							{ name: 'Letter Landscape', value: 'letter-landscape' },
							{ name: 'Square', value: 'square' },
						],
						default: 'a4',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'string',
						default: '210mm',
						description: 'Only used when preset is "custom"',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'string',
						default: '297mm',
						description: 'Only used when preset is "custom"',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('pdf4Api');
		const baseUrl = (credentials.baseUrl as string) || 'https://pdf4.dev';

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'pdf') {
					const output = this.getNodeParameter('output', i) as 'binary' | 'base64';
					const fileName = this.getNodeParameter('fileName', i) as string;
					const formatOverrides = this.getNodeParameter('formatOverrides', i, {}) as Record<
						string,
						unknown
					>;

					const body: Record<string, unknown> = {};
					if (operation === 'renderTemplate') {
						body.template_id = this.getNodeParameter('templateId', i) as string;
						body.data = parseJsonParameter.call(this, i, 'data');
					} else if (operation === 'renderHtml') {
						body.html = this.getNodeParameter('html', i) as string;
						body.data = parseJsonParameter.call(this, i, 'data');
					}
					if (Object.keys(formatOverrides).length > 0) {
						body.format = formatOverrides;
					}

					const options: IHttpRequestOptions = {
						method: 'POST',
						url: `${baseUrl}/api/v1/render`,
						body,
						json: true,
						encoding: 'arraybuffer',
						returnFullResponse: false,
					};

					const pdfBuffer = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'pdf4Api',
						options,
					)) as Buffer;

					if (output === 'binary') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(pdfBuffer),
							fileName,
							'application/pdf',
						);
						returnData.push({
							json: { success: true, fileName, size: pdfBuffer.length },
							binary: { [binaryPropertyName]: binaryData },
							pairedItem: { item: i },
						});
					} else {
						returnData.push({
							json: {
								success: true,
								fileName,
								mimeType: 'application/pdf',
								size: pdfBuffer.length,
								base64: Buffer.from(pdfBuffer).toString('base64'),
							},
							pairedItem: { item: i },
						});
					}
					continue;
				}

				if (resource === 'template') {
					if (operation === 'list') {
						const response = await this.helpers.httpRequestWithAuthentication.call(this, 'pdf4Api', {
							method: 'GET',
							url: `${baseUrl}/api/v1/templates`,
							json: true,
						});
						const list = Array.isArray(response)
							? (response as IDataObject[])
							: ((response as { data?: IDataObject[] }).data ?? []);
						for (const tmpl of list) {
							returnData.push({ json: tmpl, pairedItem: { item: i } });
						}
						continue;
					}
					if (operation === 'get') {
						const templateId = this.getNodeParameter('templateId', i) as string;
						const response = await this.helpers.httpRequestWithAuthentication.call(this, 'pdf4Api', {
							method: 'GET',
							url: `${baseUrl}/api/v1/templates/${encodeURIComponent(templateId)}`,
							json: true,
						});
						returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
						continue;
					}
				}

				throw new NodeOperationError(
					this.getNode(),
					`Unsupported resource/operation: ${resource}/${operation}`,
					{ itemIndex: i },
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function parseJsonParameter(
	this: IExecuteFunctions,
	itemIndex: number,
	name: string,
): unknown {
	const raw = this.getNodeParameter(name, itemIndex, {}) as unknown;
	if (typeof raw === 'string') {
		if (raw.trim() === '') return {};
		try {
			return JSON.parse(raw);
		} catch (err) {
			throw new NodeOperationError(
				this.getNode(),
				`Parameter "${name}" is not valid JSON: ${(err as Error).message}`,
				{ itemIndex },
			);
		}
	}
	return raw ?? {};
}
