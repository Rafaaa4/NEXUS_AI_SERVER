package com.nexus.grpc.service;

import com.nexus.common.repository.AgentRepository;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ServerRepository;
import com.nexus.grpc.proto.*;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.time.OffsetDateTime;
import java.util.UUID;

@GrpcService
public class AgentGrpcServiceImpl extends AgentServiceGrpc.AgentServiceImplBase {

    private final ServerRepository serverRepository;
    private final AgentRepository agentRepository;
    private final JobRepository jobRepository;

    public AgentGrpcServiceImpl(ServerRepository serverRepository,
                                AgentRepository agentRepository,
                                JobRepository jobRepository) {
        this.serverRepository = serverRepository;
        this.agentRepository = agentRepository;
        this.jobRepository = jobRepository;
    }

    @Override
    public void reportHeartbeat(HeartbeatRequest request, StreamObserver<HeartbeatResponse> responseObserver) {
        try {
            UUID serverId = UUID.fromString(request.getServerId());
            agentRepository.findByServerId(serverId).ifPresent(agent -> {
                agent.setStatus("online");
                agent.setVersion(request.getAgentVersion());
                agent.setLastSeenAt(OffsetDateTime.now());
                agentRepository.save(agent);
            });

            serverRepository.findById(serverId).ifPresent(s -> {
                s.setStatus("online");
                serverRepository.save(s);
            });

            HeartbeatResponse response = HeartbeatResponse.newBuilder()
                    .setAcknowledged(true)
                    .setServerStatus("online")
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }

    @Override
    public void streamTelemetry(TelemetryRecord request, StreamObserver<TelemetryAck> responseObserver) {
        TelemetryAck ack = TelemetryAck.newBuilder()
                .setSuccess(true)
                .setMessage("Telemetry recorded for server " + request.getServerId())
                .build();
        responseObserver.onNext(ack);
        responseObserver.onCompleted();
    }

    @Override
    public void fetchPendingJob(JobPollRequest request, StreamObserver<JobPollResponse> responseObserver) {
        try {
            UUID serverId = UUID.fromString(request.getServerId());
            var jobs = jobRepository.findByOrganizationIdAndServerIdAndStatus(
                    UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f"), serverId, "queued");

            if (!jobs.isEmpty()) {
                var job = jobs.get(0);
                JobPollResponse res = JobPollResponse.newBuilder()
                        .setHasJob(true)
                        .setJobId(job.getId().toString())
                        .setJobType(job.getJobType())
                        .setPayload(job.getResult() != null ? job.getResult() : "{}")
                        .build();
                responseObserver.onNext(res);
            } else {
                JobPollResponse res = JobPollResponse.newBuilder()
                        .setHasJob(false)
                        .build();
                responseObserver.onNext(res);
            }
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }
}
