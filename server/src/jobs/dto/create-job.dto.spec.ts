import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateJobDto } from './create-job.dto';

async function validateDto(plain: object): Promise<string[]> {
  const instance = plainToInstance(CreateJobDto, plain);
  const errors = await validate(instance);
  return errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
}

const validPayload = {
  company: 'Acme Corp',
  title: 'Software Engineer',
  dateApplied: '2024-03-01',
  status: 'applied',
};

describe('CreateJobDto', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  it('passes with all required fields', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('passes with all optional fields provided', async () => {
    const errors = await validateDto({
      ...validPayload,
      notes: 'Great opportunity',
      link: 'https://acme.com/jobs/1',
    });
    expect(errors).toHaveLength(0);
  });

  it('passes when optional fields are absent', async () => {
    const { ...required } = validPayload;
    const errors = await validateDto(required);
    expect(errors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // company
  // -------------------------------------------------------------------------
  it('fails when company is missing', async () => {
    const { company: _, ...rest } = validPayload;
    const errors = await validateDto(rest);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when company is whitespace only (trimmed to empty by @Transform)', async () => {
    const errors = await validateDto({ ...validPayload, company: '   ' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when company exceeds 100 characters', async () => {
    const errors = await validateDto({ ...validPayload, company: 'a'.repeat(101) });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes when company is exactly 100 characters (boundary)', async () => {
    const errors = await validateDto({ ...validPayload, company: 'a'.repeat(100) });
    expect(errors).toHaveLength(0);
  });

  it('trims leading/trailing whitespace from company via @Transform', async () => {
    const instance = plainToInstance(CreateJobDto, { ...validPayload, company: '  Acme  ' });
    expect(instance.company).toBe('Acme');
  });

  // -------------------------------------------------------------------------
  // title
  // -------------------------------------------------------------------------
  it('fails when title is missing', async () => {
    const { title: _, ...rest } = validPayload;
    const errors = await validateDto(rest);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when title is whitespace only', async () => {
    const errors = await validateDto({ ...validPayload, title: '   ' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when title exceeds 100 characters', async () => {
    const errors = await validateDto({ ...validPayload, title: 'a'.repeat(101) });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes when title is exactly 100 characters (boundary)', async () => {
    const errors = await validateDto({ ...validPayload, title: 'a'.repeat(100) });
    expect(errors).toHaveLength(0);
  });

  it('trims leading/trailing whitespace from title via @Transform', async () => {
    const instance = plainToInstance(CreateJobDto, { ...validPayload, title: '  Dev  ' });
    expect(instance.title).toBe('Dev');
  });

  // -------------------------------------------------------------------------
  // dateApplied
  // -------------------------------------------------------------------------
  it('fails when dateApplied is missing', async () => {
    const { dateApplied: _, ...rest } = validPayload;
    const errors = await validateDto(rest);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when dateApplied is not an ISO date string', async () => {
    const errors = await validateDto({ ...validPayload, dateApplied: '01-03-2024' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when dateApplied is a plain string', async () => {
    const errors = await validateDto({ ...validPayload, dateApplied: 'yesterday' });
    expect(errors.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // status
  // -------------------------------------------------------------------------
  it('fails when status is missing', async () => {
    const { status: _, ...rest } = validPayload;
    const errors = await validateDto(rest);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when status is not one of the allowed values', async () => {
    const errors = await validateDto({ ...validPayload, status: 'pending' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it.each(['applied', 'interviewing', 'offered', 'rejected'])(
    'passes for valid status "%s"',
    async (status) => {
      const errors = await validateDto({ ...validPayload, status });
      expect(errors).toHaveLength(0);
    },
  );

  // -------------------------------------------------------------------------
  // notes (optional)
  // -------------------------------------------------------------------------
  it('passes when notes is a non-empty string', async () => {
    const errors = await validateDto({ ...validPayload, notes: 'Good vibes' });
    expect(errors).toHaveLength(0);
  });

  it('fails when notes exceeds 2000 characters', async () => {
    const errors = await validateDto({ ...validPayload, notes: 'a'.repeat(2001) });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes when notes is exactly 2000 characters (boundary)', async () => {
    const errors = await validateDto({ ...validPayload, notes: 'a'.repeat(2000) });
    expect(errors).toHaveLength(0);
  });

  it('transforms whitespace-only notes to undefined via @Transform', async () => {
    const instance = plainToInstance(CreateJobDto, { ...validPayload, notes: '   ' });
    expect(instance.notes).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // link (optional)
  // -------------------------------------------------------------------------
  it('passes when link is a valid URL with protocol', async () => {
    const errors = await validateDto({ ...validPayload, link: 'https://example.com/jobs/1' });
    expect(errors).toHaveLength(0);
  });

  it('passes when link is a valid URL without protocol (require_protocol: false)', async () => {
    const errors = await validateDto({ ...validPayload, link: 'example.com/jobs/1' });
    expect(errors).toHaveLength(0);
  });

  it('fails when link is a plain invalid string', async () => {
    const errors = await validateDto({ ...validPayload, link: 'not a url at all!!' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when link exceeds 500 characters', async () => {
    const errors = await validateDto({
      ...validPayload,
      link: `https://example.com/${'a'.repeat(490)}`,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
