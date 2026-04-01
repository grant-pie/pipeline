import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import JobFormView from './JobFormView.vue';
import type { JobApplication } from '@/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.hoisted(() => vi.fn());
const mockRoute = vi.hoisted(() => ({ params: {} as Record<string, string> }));
const mockGetJob = vi.hoisted(() => vi.fn());
const mockCreateJob = vi.hoisted(() => vi.fn());
const mockUpdateJob = vi.hoisted(() => vi.fn());
const mockGetOne = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRouter: () => ({ push: mockPush }), useRoute: () => mockRoute };
});

vi.mock('@/stores/jobs', () => ({
  useJobsStore: () => ({
    getJob: mockGetJob,
    createJob: mockCreateJob,
    updateJob: mockUpdateJob,
  }),
}));

vi.mock('@/api/jobs', () => ({
  jobsApi: { getOne: mockGetOne },
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

// ── Fixture ─────────────────────────────────────────────────────────────────

const existingJob: JobApplication = {
  id: 'job-123',
  company: 'Acme Corp',
  title: 'Frontend Engineer',
  dateApplied: '2026-03-01',
  status: 'applied',
  link: 'https://acme.com/jobs/1',
  notes: 'Great culture.',
  userId: 'user-1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function mountForm(attachTo?: HTMLElement) {
  return mount(JobFormView, { attachTo, global: { stubs } });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('JobFormView', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    mockRoute.params = {};
    mockPush.mockReset();
    mockGetJob.mockReset();
    mockCreateJob.mockReset();
    mockUpdateJob.mockReset();
    mockGetOne.mockReset();
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  // ── Create mode ─────────────────────────────────────────────────────────

  describe('create mode (no :id param)', () => {
    it('shows "New application" heading', () => {
      const wrapper = mountForm(div);
      expect(wrapper.text()).toContain('New application');
    });

    it('shows "Add application" on the submit button', () => {
      const wrapper = mountForm(div);
      expect(wrapper.find('button[type="submit"]').text()).toContain('Add application');
    });

    it('defaults dateApplied to today', () => {
      const wrapper = mountForm(div);
      const today = new Date().toISOString().slice(0, 10);
      expect((wrapper.find('#dateApplied').element as HTMLInputElement).value).toBe(today);
    });

    it('calls createJob with the correct payload on submit', async () => {
      mockCreateJob.mockResolvedValue({ ...existingJob, id: 'new-id' });
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('interviewing');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(mockCreateJob).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Globex',
          title: 'Dev',
          dateApplied: '2026-04-01',
          status: 'interviewing',
        }),
      );
    });

    it('prepends https:// to a bare link via normalizeUrl', async () => {
      mockCreateJob.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('applied');
      await wrapper.find('#link').setValue('globex.com/jobs');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      const payload = mockCreateJob.mock.calls[0][0];
      expect(payload.link).toBe('https://globex.com/jobs');
    });

    it('submits link as undefined when the link field is empty', async () => {
      mockCreateJob.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('applied');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      const payload = mockCreateJob.mock.calls[0][0];
      expect(payload.link).toBeUndefined();
    });

    it('submits notes as undefined when the notes field is empty', async () => {
      mockCreateJob.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('applied');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      const payload = mockCreateJob.mock.calls[0][0];
      expect(payload.notes).toBeUndefined();
    });

    it('redirects to dashboard after successful create', async () => {
      mockCreateJob.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('applied');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
    });

    it('shows an error message when createJob throws', async () => {
      mockCreateJob.mockRejectedValue(new Error('Server error'));
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('applied');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(wrapper.find('.error-msg').exists()).toBe(true);
      expect(wrapper.text()).toContain('Server error');
    });

    it('disables the submit button while loading', async () => {
      let resolve: () => void;
      mockCreateJob.mockReturnValue(new Promise<JobApplication>((r) => { resolve = () => r(existingJob); }));
      const wrapper = mountForm(div);

      await wrapper.find('#company').setValue('Globex');
      await wrapper.find('#title').setValue('Dev');
      await wrapper.find('#dateApplied').setValue('2026-04-01');
      await wrapper.find('#status').setValue('applied');
      wrapper.find('form').trigger('submit.prevent');
      await vi.waitFor(() =>
        expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true),
      );
      resolve!();
    });
  });

  // ── Edit mode ────────────────────────────────────────────────────────────

  describe('edit mode (:id param present)', () => {
    beforeEach(() => {
      mockRoute.params = { id: 'job-123' };
    });

    it('shows "Edit application" heading', async () => {
      mockGetJob.mockReturnValue(existingJob);
      const wrapper = mountForm(div);
      await flushPromises();
      expect(wrapper.text()).toContain('Edit application');
    });

    it('shows "Save changes" on the submit button', async () => {
      mockGetJob.mockReturnValue(existingJob);
      const wrapper = mountForm(div);
      await flushPromises();
      expect(wrapper.find('button[type="submit"]').text()).toContain('Save changes');
    });

    it('pre-fills form fields from the store cache', async () => {
      mockGetJob.mockReturnValue(existingJob);
      const wrapper = mountForm(div);
      await flushPromises();

      expect((wrapper.find('#company').element as HTMLInputElement).value).toBe('Acme Corp');
      expect((wrapper.find('#title').element as HTMLInputElement).value).toBe('Frontend Engineer');
      expect((wrapper.find('#status').element as HTMLSelectElement).value).toBe('applied');
    });

    it('falls back to jobsApi.getOne when job is not in the store cache', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetOne.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);
      await flushPromises();

      expect(mockGetOne).toHaveBeenCalledWith('job-123');
      expect((wrapper.find('#company').element as HTMLInputElement).value).toBe('Acme Corp');
    });

    it('shows the not-found state when the API call fails', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetOne.mockRejectedValue(new Error('Not found'));
      const wrapper = mountForm(div);
      await flushPromises();

      expect(wrapper.find('.not-found').exists()).toBe(true);
      expect(wrapper.find('form').exists()).toBe(false);
    });

    it('calls updateJob with the job id and payload on submit', async () => {
      mockGetJob.mockReturnValue(existingJob);
      mockUpdateJob.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);
      await flushPromises();

      await wrapper.find('#status').setValue('interviewing');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(mockUpdateJob).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({ status: 'interviewing' }),
      );
    });

    it('redirects to dashboard after successful edit', async () => {
      mockGetJob.mockReturnValue(existingJob);
      mockUpdateJob.mockResolvedValue(existingJob);
      const wrapper = mountForm(div);
      await flushPromises();

      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
    });

    it('shows an error when updateJob throws', async () => {
      mockGetJob.mockReturnValue(existingJob);
      mockUpdateJob.mockRejectedValue(new Error('Update failed'));
      const wrapper = mountForm(div);
      await flushPromises();

      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(wrapper.find('.error-msg').text()).toContain('Update failed');
    });
  });
});
